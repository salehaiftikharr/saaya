"""Dynamic tool lifecycle: propose as draft, activate, disable, roll back.

Every change appends a version row; the live script file exists on disk only
while the tool is active.
"""

import json
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import Connection, select
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import DynamicTool, DynamicToolVersion
from saaya.tools.validation import ToolViolation, validate_tool


@dataclass(frozen=True)
class ToolInfo:
    name: str
    description: str
    params: dict[str, str]
    script: str
    status: str
    version: int


class ToolRegistry:
    def __init__(self, engine: AsyncEngine, scripts_dir: Path) -> None:
        self._engine = engine
        self._scripts_dir = scripts_dir

    def script_path(self, name: str) -> Path:
        return self._scripts_dir / f"{name}.py"

    async def propose(
        self, *, name: str, description: str, params: dict[str, str], script: str
    ) -> list[ToolViolation]:
        """A clean proposal lands as a draft (or a new version of an existing
        tool, deactivated until re-approved); violations reject it whole."""
        violations = validate_tool(name, description, params, script)
        if violations:
            return violations

        def _save(sync_conn: Connection) -> None:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                tool = session.get(DynamicTool, name)
                if tool is None:
                    tool = DynamicTool(
                        name=name,
                        description=description,
                        params_json=json.dumps(params),
                        script=script,
                        status="draft",
                        version=1,
                    )
                    session.add(tool)
                else:
                    tool.description = description
                    tool.params_json = json.dumps(params)
                    tool.script = script
                    tool.version += 1
                    tool.status = "draft"
                session.add(
                    DynamicToolVersion(
                        id=uuid.uuid4(),
                        name=name,
                        version=tool.version,
                        description=description,
                        params_json=json.dumps(params),
                        script=script,
                        reason="proposed",
                    )
                )
                session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_save)
        self.script_path(name).unlink(missing_ok=True)
        return []

    async def set_status(self, name: str, status: str) -> ToolInfo:
        if status not in {"active", "disabled"}:
            raise ValueError("status must be active or disabled")

        def _update(sync_conn: Connection) -> ToolInfo:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                tool = session.get(DynamicTool, name)
                if tool is None:
                    raise ValueError(f"unknown tool {name!r}")
                tool.status = status
                session.commit()
                return _info(tool)

        async with self._engine.connect() as connection:
            info = await connection.run_sync(_update)
        if status == "active":
            self._scripts_dir.mkdir(parents=True, exist_ok=True)
            self.script_path(name).write_text(info.script, encoding="utf-8")
        else:
            self.script_path(name).unlink(missing_ok=True)
        return info

    async def rollback(self, name: str, version: int) -> ToolInfo:
        """Restore an earlier version's content as a new version, deactivated
        until re-approved."""

        def _rollback(sync_conn: Connection) -> ToolInfo:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                tool = session.get(DynamicTool, name)
                target = session.execute(
                    select(DynamicToolVersion).where(
                        DynamicToolVersion.name == name,
                        DynamicToolVersion.version == version,
                    )
                ).scalar_one_or_none()
                if tool is None or target is None:
                    raise ValueError(f"no version {version} for tool {name!r}")
                tool.description = target.description
                tool.params_json = target.params_json
                tool.script = target.script
                tool.version += 1
                tool.status = "draft"
                session.add(
                    DynamicToolVersion(
                        id=uuid.uuid4(),
                        name=name,
                        version=tool.version,
                        description=target.description,
                        params_json=target.params_json,
                        script=target.script,
                        reason=f"rollback to version {version}",
                    )
                )
                session.commit()
                return _info(tool)

        async with self._engine.connect() as connection:
            info = await connection.run_sync(_rollback)
        self.script_path(name).unlink(missing_ok=True)
        return info

    async def list_tools(self) -> list[ToolInfo]:
        def _list(sync_conn: Connection) -> list[ToolInfo]:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                tools = session.execute(select(DynamicTool).order_by(DynamicTool.name)).scalars()
                return [_info(tool) for tool in tools]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_list)

    async def active_tools(self) -> list[ToolInfo]:
        return [tool for tool in await self.list_tools() if tool.status == "active"]


def _info(tool: DynamicTool) -> ToolInfo:
    return ToolInfo(
        name=tool.name,
        description=tool.description,
        params=json.loads(tool.params_json),
        script=tool.script,
        status=tool.status,
        version=tool.version,
    )
