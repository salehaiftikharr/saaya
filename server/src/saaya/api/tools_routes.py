"""Dynamic tool lifecycle API: inspect, approve, disable, roll back."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

tools_router = APIRouter()


class ToolView(BaseModel):
    name: str
    description: str
    params: dict[str, str]
    script: str
    status: str
    version: int


class RollbackBody(BaseModel):
    version: int


def _view(info: object) -> ToolView:
    return ToolView.model_validate(info, from_attributes=True)


@tools_router.get("/api/tools")
async def list_tools(request: Request) -> list[ToolView]:
    return [_view(t) for t in await request.app.state.tool_registry.list_tools()]


@tools_router.post("/api/tools/{name}/activate")
async def activate(request: Request, name: str) -> ToolView:
    try:
        info = await request.app.state.tool_registry.set_status(name, "active")
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await request.app.state.rebuild_agent()
    return _view(info)


@tools_router.post("/api/tools/{name}/disable")
async def disable(request: Request, name: str) -> ToolView:
    try:
        info = await request.app.state.tool_registry.set_status(name, "disabled")
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await request.app.state.rebuild_agent()
    return _view(info)


@tools_router.post("/api/tools/{name}/rollback")
async def rollback(request: Request, name: str, body: RollbackBody) -> ToolView:
    try:
        info = await request.app.state.tool_registry.rollback(name, body.version)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    await request.app.state.rebuild_agent()
    return _view(info)
