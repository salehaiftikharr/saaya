"""The Job runner's tool surface, provider-free so tests can exercise every
boundary without importing model clients. Refusals and executions are ledger
events; gated commands go through the ADR-007 approval flow."""

import asyncio
import json
from pathlib import Path
from typing import cast

from langchain_core.tools import BaseTool, StructuredTool

from saaya.jobs.commands import evaluate, run_command
from saaya.jobs.store import ApprovalStore, JobStore
from saaya.jobs.workspace import (
    WorkspaceViolation,
    guarded_read,
    guarded_write,
    list_files,
)

APPROVAL_WAIT_TEXT = (
    "APPROVAL_REQUIRED: the owner must approve this command before it can "
    "run. The request has been recorded. End this step now; the job will "
    "resume once a decision is made."
)


def _fmt(argv: object) -> str:
    if isinstance(argv, list):
        return " ".join(str(item) for item in cast("list[object]", argv))
    return str(argv)


async def settle_decided_approvals(
    workspace: Path, store: JobStore, approvals: ApprovalStore, job_id: str
) -> str:
    """Honor owner decisions in code before the model runs, so an approval is
    an enforced fact rather than a hope the model may or may not act on (F1).

    An approved command is executed here, deterministically, with its ledger
    event and consumption; a rejected one is recorded and consumed. Returns a
    note the executor relays so the model does not re-issue what already ran.
    """
    notes: list[str] = []
    for approval in await approvals.for_job(job_id):
        if approval.decision is None or approval.consumed_at is not None:
            continue
        argv = approval.payload.get("argv")
        if approval.decision == "rejected":
            await approvals.consume(approval.id)
            await store.append_event(
                job_id,
                "approval_rejected",
                {"approval_id": approval.id, "preview": approval.preview},
                actor="user",
            )
            notes.append(
                f"The owner rejected `{_fmt(argv)}`. Do not attempt it again; "
                "adjust the step or report the limitation honestly."
            )
            continue
        await store.append_event(
            job_id,
            "approval_accepted",
            {"approval_id": approval.id, "preview": approval.preview},
            actor="user",
        )
        if isinstance(argv, list):
            command = [str(item) for item in cast("list[object]", argv)]
            result = await asyncio.to_thread(run_command, workspace, command)
            await store.append_event(
                job_id,
                "command_executed",
                {
                    "argv": command,
                    "exit_code": result.exit_code,
                    "duration_ms": result.duration_ms,
                    "truncated": result.truncated,
                },
            )
            await approvals.consume(approval.id)
            notes.append(
                f"The owner-approved command `{' '.join(command)}` was already "
                f"run for you (exit {result.exit_code}). Do not run it again; "
                "continue the step with that result in hand."
            )
        else:
            await approvals.consume(approval.id)
    return "\n".join(notes)


def build_job_tools(
    workspace: Path, store: JobStore, approvals: ApprovalStore, job_id: str
) -> list[BaseTool]:
    async def _refused(error: WorkspaceViolation) -> str:
        await store.append_event(job_id, "policy_refused", {"detail": str(error)}, actor="system")
        return f"Refused: {error}"

    async def write_file(path: str, content: str) -> str:
        try:
            await asyncio.to_thread(guarded_write, workspace, path, content)
        except WorkspaceViolation as error:
            return await _refused(error)
        return f"Wrote {path}."

    async def read_file(path: str) -> str:
        try:
            return await asyncio.to_thread(guarded_read, workspace, path)
        except WorkspaceViolation as error:
            return await _refused(error)

    async def list_workspace() -> str:
        rows = await asyncio.to_thread(list_files, workspace)
        return json.dumps(rows)

    async def run(command: list[str]) -> str:
        verdict = evaluate(command)
        if verdict.kind == "refused":
            await store.append_event(
                job_id,
                "policy_refused",
                {"detail": verdict.reason, "argv": command},
                actor="system",
            )
            return f"Refused by command policy: {verdict.reason}"
        if verdict.kind == "gated":
            payload: dict[str, object] = {"argv": command}
            decided = await approvals.decided_unconsumed(job_id, payload)
            if decided is None:
                pending = await approvals.pending(job_id)
                already = pending is not None and pending.payload == payload
                if not already:
                    created = await approvals.create_approval(
                        job_id,
                        kind="command",
                        preview=(
                            f"Run `{' '.join(command)}` in the job workspace. {verdict.reason}."
                        ),
                        payload=payload,
                    )
                    await store.append_event(
                        job_id,
                        "approval_requested",
                        {"approval_id": created.id, "preview": created.preview},
                    )
                return APPROVAL_WAIT_TEXT
            if decided.decision == "rejected":
                await approvals.consume(decided.id)
                await store.append_event(
                    job_id,
                    "approval_rejected",
                    {"approval_id": decided.id, "preview": decided.preview},
                    actor="user",
                )
                return (
                    "The owner rejected this command. Do not attempt it again; "
                    "adjust the step or report the limitation honestly."
                )
            await approvals.consume(decided.id)
            await store.append_event(
                job_id,
                "approval_accepted",
                {"approval_id": decided.id, "preview": decided.preview},
                actor="user",
            )
        result = await asyncio.to_thread(run_command, workspace, command)
        await store.append_event(
            job_id,
            "command_executed",
            {
                "argv": command,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "truncated": result.truncated,
            },
        )
        body = result.stdout if result.stdout else result.stderr
        return f"exit {result.exit_code}\n{body}"

    async def register_artifact(path: str, title: str, kind: str = "report") -> str:
        try:
            target = await asyncio.to_thread(guarded_read, workspace, path)
        except WorkspaceViolation as error:
            return await _refused(error)
        content_type = "text/markdown" if path.endswith(".md") else "text/plain"
        if path.endswith((".patch", ".diff")):
            content_type = "text/x-diff"
            kind = "patch"
        seq = await store.append_event(
            job_id, "artifact_created", {"path": path, "title": title, "kind": kind}
        )
        artifact = await approvals.create_artifact(
            job_id,
            path=path,
            kind=kind,
            title=title,
            content_type=content_type,
            size=len(target.encode("utf-8")),
            event_seq=seq,
        )
        return f"Artifact registered: {title} ({artifact.id})."

    return [
        StructuredTool.from_function(
            coroutine=write_file,
            name="write_file",
            description="Write a text file at a relative path inside the job workspace.",
        ),
        StructuredTool.from_function(
            coroutine=read_file,
            name="read_file",
            description="Read a text file at a relative path inside the job workspace.",
        ),
        StructuredTool.from_function(
            coroutine=list_workspace,
            name="list_workspace",
            description="List every file in the job workspace with sizes.",
        ),
        StructuredTool.from_function(
            coroutine=run,
            name="run_command",
            description=(
                "Run one command inside the job workspace as an argv list, "
                'for example ["git", "status"]. Only allowlisted read '
                "commands run directly; write commands need owner approval "
                "and there is no network access."
            ),
        ),
        StructuredTool.from_function(
            coroutine=register_artifact,
            name="register_artifact",
            description=(
                "Register a finished workspace file as a durable artifact "
                "the owner can open later. Use for reports and patches, "
                "not scratch files."
            ),
        ),
    ]


def make_start_job_tool(store: JobStore) -> BaseTool:
    """The chat agent's bridge into Jobs. The description constrains use to
    explicit asks; the returned text makes the job visible in the thread, so
    a conversation is never silently jobified (ADR-003)."""
    from langchain_core.runnables import RunnableConfig

    async def start_job(goal: str, config: RunnableConfig) -> str:
        configurable = config.get("configurable", {})
        thread_id = str(configurable.get("thread_id", "")) or None
        job = await store.create(goal=goal, thread_id=thread_id)
        return (
            f"Job started ({job.id}). It runs in the background inside its "
            "own controlled workspace, keeps going if this conversation "
            "closes, and its full progress ledger is in the Work panel. "
            "Tell the user the job has started and what it will do."
        )

    return StructuredTool.from_function(
        coroutine=start_job,
        name="start_job",
        description=(
            "Start a durable background job with its own isolated "
            "workspace, plan, and progress ledger. Jobs survive restarts. "
            "Inside a job, write-class commands (like git init or git add) "
            "automatically pause the job in waiting_approval until the "
            "owner approves them in the Work panel, then the job resumes "
            "and really runs them; describe this correctly if asked. Use "
            "ONLY when the user explicitly asks for background or "
            "long-running work, or explicitly agrees to it. Never for "
            "questions or quick tasks. goal: a complete, self-contained "
            "description of the outcome; the job cannot see other jobs' "
            "workspaces or this chat."
        ),
    )


def make_check_jobs_tool(store: JobStore, approvals: ApprovalStore) -> BaseTool:
    """Lets the conversation use its jobs' results: states, recent events,
    and artifact titles, straight from the ledger."""
    from langchain_core.runnables import RunnableConfig

    async def check_jobs(config: RunnableConfig) -> str:
        configurable = config.get("configurable", {})
        thread_id = str(configurable.get("thread_id", "")) or None
        if thread_id is None:
            return "No conversation context; nothing to check."
        rows = [job for job in await store.list_jobs(limit=20) if job.thread_id == thread_id]
        if not rows:
            return "This conversation has no jobs."
        lines: list[str] = []
        for job in rows:
            arts = await approvals.artifacts_for_job(job.id)
            events = await store.events(job.id)
            tail = events[-1].type if events else "none"
            line = f"- {job.goal[:80]} | state: {job.state} | last event: {tail}"
            if job.error:
                line += f" | error: {job.error[:80]}"
            if arts:
                line += " | artifacts: " + ", ".join(f"{a.title} (id {a.id})" for a in arts)
            lines.append(line)
        return "\n".join(lines)

    return StructuredTool.from_function(
        coroutine=check_jobs,
        name="check_jobs",
        description=(
            "Check the state, latest events, errors, and artifacts of this "
            "conversation's background jobs. Use when the user asks about "
            "job progress or wants to work with a job's results. Read an "
            "artifact's content with read_job_artifact and its id."
        ),
    )


def make_read_artifact_tool(
    store: JobStore, approvals: ApprovalStore, workspace_root: Path
) -> BaseTool:
    """Chat-side read access to job artifacts, scoped to the conversation:
    an artifact is readable only if its job belongs to this thread, so one
    conversation can never read another's work."""
    from langchain_core.runnables import RunnableConfig

    from saaya.jobs.workspace import job_workspace

    async def read_job_artifact(artifact_id: str, config: RunnableConfig) -> str:
        configurable = config.get("configurable", {})
        thread_id = str(configurable.get("thread_id", "")) or None
        artifact = await approvals.get_artifact(artifact_id)
        if artifact is None:
            return "No such artifact."
        job = await store.get(artifact.job_id)
        if job is None or thread_id is None or job.thread_id != thread_id:
            return "That artifact does not belong to this conversation."
        workspace = job_workspace(workspace_root, job.workspace)
        try:
            content = await asyncio.to_thread(guarded_read, workspace, artifact.path)
        except WorkspaceViolation as error:
            return f"Refused: {error}"
        return content[:12_000]

    return StructuredTool.from_function(
        coroutine=read_job_artifact,
        name="read_job_artifact",
        description=(
            "Read the content of one of this conversation's job artifacts "
            "by its id (from check_jobs). Use it to summarize or build on "
            "a job's results."
        ),
    )
