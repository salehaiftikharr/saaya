"""Registry lifecycle and runner behavior. DB via the isolated test database;
the runner runs real subprocesses with no network."""

from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.tools.registry import ToolRegistry
from saaya.tools.runner import run_tool_script

SCRIPT_V1 = """import json, os
params = json.loads(os.environ["TOOL_INPUT"])
print(params["text"][::-1])
"""

SCRIPT_V2 = """import json, os
params = json.loads(os.environ["TOOL_INPUT"])
print(params["text"].upper())
"""


@pytest.fixture()
def registry(engine: AsyncEngine, tmp_path: Path) -> ToolRegistry:
    return ToolRegistry(engine, tmp_path / "tools")


async def test_propose_activate_disable_lifecycle(registry: ToolRegistry) -> None:
    violations = await registry.propose(
        name="reverse_text",
        description="Reverses text.",
        params={"text": "string"},
        script=SCRIPT_V1,
    )
    assert violations == []
    tools = await registry.list_tools()
    assert tools[0].status == "draft"
    assert not registry.script_path("reverse_text").exists()

    active = await registry.set_status("reverse_text", "active")
    assert active.status == "active"
    assert registry.script_path("reverse_text").read_text().startswith("import json")

    disabled = await registry.set_status("reverse_text", "disabled")
    assert disabled.status == "disabled"
    assert not registry.script_path("reverse_text").exists()


async def test_invalid_proposal_is_rejected_whole(registry: ToolRegistry) -> None:
    violations = await registry.propose(
        name="BadName",
        description="x",
        params={"text": "string"},
        script="print('no contract')",
    )
    assert {v.rule for v in violations} >= {"name", "contract"}
    assert await registry.list_tools() == []


async def test_new_version_deactivates_until_reapproved(registry: ToolRegistry) -> None:
    await registry.propose(
        name="shout", description="Upper.", params={"text": "string"}, script=SCRIPT_V1
    )
    await registry.set_status("shout", "active")
    await registry.propose(
        name="shout", description="Upper.", params={"text": "string"}, script=SCRIPT_V2
    )
    tools = await registry.list_tools()
    assert tools[0].version == 2
    assert tools[0].status == "draft", "a changed tool must be re-approved"
    assert not registry.script_path("shout").exists()


async def test_rollback_restores_content_as_new_draft(registry: ToolRegistry) -> None:
    await registry.propose(
        name="flip", description="v1.", params={"text": "string"}, script=SCRIPT_V1
    )
    await registry.propose(
        name="flip", description="v2.", params={"text": "string"}, script=SCRIPT_V2
    )
    info = await registry.rollback("flip", 1)
    assert info.version == 3
    assert info.script == SCRIPT_V1
    assert info.status == "draft"


async def test_runner_executes_with_scrubbed_env(tmp_path: Path) -> None:
    script = tmp_path / "probe.py"
    script.write_text(
        "import json, os\n"
        'params = json.loads(os.environ["TOOL_INPUT"])\n'
        'print(params["text"][::-1])\n'
        'print("SECRET" if os.environ.get("CLAUDE_API_KEY") else "CLEAN")\n',
        encoding="utf-8",
    )
    output = await run_tool_script(script, {"text": "saaya"})
    assert output.splitlines() == ["ayaas", "CLEAN"]


async def test_runner_reports_failures_honestly(tmp_path: Path) -> None:
    script = tmp_path / "boom.py"
    script.write_text("raise RuntimeError('nope')  # TOOL_INPUT", encoding="utf-8")
    output = await run_tool_script(script, {})
    assert output.startswith("Tool failed (exit 1)")
    assert "nope" in output
