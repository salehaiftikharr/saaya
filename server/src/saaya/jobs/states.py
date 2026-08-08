"""The Job lifecycle (ADR-003). Transitions not listed here are illegal and
raise; completion is always a recorded transition, never an inference."""

DRAFT = "draft"
QUEUED = "queued"
PLANNING = "planning"
WAITING_APPROVAL = "waiting_approval"
RUNNING = "running"
PAUSED = "paused"
BLOCKED = "blocked"
RETRYING = "retrying"
FAILED = "failed"
CANCELLED = "cancelled"
COMPLETED = "completed"

TERMINAL = frozenset({COMPLETED, FAILED, CANCELLED})
LIVE = frozenset({PLANNING, RUNNING, RETRYING})

LEGAL_TRANSITIONS: dict[str, frozenset[str]] = {
    DRAFT: frozenset({QUEUED, CANCELLED}),
    QUEUED: frozenset({PLANNING, CANCELLED}),
    PLANNING: frozenset({RUNNING, BLOCKED, FAILED, CANCELLED}),
    RUNNING: frozenset({WAITING_APPROVAL, RETRYING, BLOCKED, PAUSED, FAILED, COMPLETED, CANCELLED}),
    WAITING_APPROVAL: frozenset({RUNNING, CANCELLED}),
    PAUSED: frozenset({RUNNING, CANCELLED}),
    BLOCKED: frozenset({RETRYING, CANCELLED}),
    RETRYING: frozenset({RUNNING, FAILED, CANCELLED}),
    FAILED: frozenset({RETRYING}),
    CANCELLED: frozenset(),
    COMPLETED: frozenset(),
}


class IllegalTransition(Exception):
    def __init__(self, current: str, target: str) -> None:
        super().__init__(f"illegal job transition {current} -> {target}")
        self.current = current
        self.target = target


def check_transition(current: str, target: str) -> None:
    if target not in LEGAL_TRANSITIONS.get(current, frozenset()):
        raise IllegalTransition(current, target)
