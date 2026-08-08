"""Bridges the registry into the agent: propose_tool for the agent, and one
StructuredTool per active dynamic tool."""

from typing import Any

from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, create_model

from saaya.tools.registry import ToolInfo, ToolRegistry
from saaya.tools.runner import run_tool_script

_PARAM_TYPES: dict[str, type] = {"string": str, "number": float, "boolean": bool}


def make_propose_tool(registry: ToolRegistry) -> BaseTool:
    async def propose_tool(name: str, description: str, params: dict[str, str], script: str) -> str:
        violations = await registry.propose(
            name=name, description=description, params=params, script=script
        )
        if violations:
            lines = "\n".join(f"- {v.rule}: {v.detail}" for v in violations)
            return f"Rejected by validation:\n{lines}"
        return (
            f"Draft saved: {name}. It stays inactive until the owner approves "
            "it in the Tools panel; say so if the user asks to use it now."
        )

    return StructuredTool.from_function(
        coroutine=propose_tool,
        name="propose_tool",
        description=(
            "Propose a new reusable capability as a Python script. The script "
            "reads a JSON object from the TOOL_INPUT environment variable and "
            "prints its result to stdout. params maps parameter names to "
            "string, number, or boolean. Drafts activate only after human "
            "approval. Propose a tool when the user asks for a repeatable "
            "capability, not for one-off work."
        ),
    )


def _args_schema(info: ToolInfo) -> type[BaseModel]:
    fields: dict[str, Any] = {
        param: (_PARAM_TYPES[kind], ...) for param, kind in info.params.items()
    }
    return create_model(f"{info.name}_args", **fields)


def build_dynamic_tools(active: list[ToolInfo], registry: ToolRegistry) -> list[BaseTool]:
    tools: list[BaseTool] = []
    for info in active:
        # Default-arg binding: each closure runs its own tool.
        async def call(_info: ToolInfo = info, **kwargs: Any) -> str:
            return await run_tool_script(registry.script_path(_info.name), kwargs)

        tools.append(
            StructuredTool.from_function(
                coroutine=call,
                name=info.name,
                description=f"{info.description} (owner-approved dynamic tool)",
                args_schema=_args_schema(info),
            )
        )
    return tools
