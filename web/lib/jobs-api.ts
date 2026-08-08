// Client for the Job endpoints. The ledger is the wire format: the SSE tail
// and the detail endpoint carry the same rows, so the UI renders persisted
// truth only (ADR-003).

export type JobState =
	| "draft"
	| "queued"
	| "planning"
	| "waiting_approval"
	| "running"
	| "paused"
	| "blocked"
	| "retrying"
	| "failed"
	| "cancelled"
	| "completed";

export type JobInfo = {
	id: string;
	thread_id: string | null;
	goal: string;
	state: JobState;
	error: string | null;
	step_budget: number;
	wall_clock_budget_s: number;
	workspace: string;
	last_event_seq: number;
	created_at: string;
	updated_at: string;
	started_at: string | null;
	finished_at: string | null;
};

export type PlanStep = { intent: string; creates: string[] };

export type JobEvent = {
	seq: number;
	at: string;
	actor: "user" | "saaya" | "system";
	type: string;
	payload: Record<string, unknown>;
};

export type JobDetail = { job: JobInfo; events: JobEvent[] };

export const LIVE_STATES: ReadonlySet<JobState> = new Set([
	"queued",
	"planning",
	"running",
	"retrying",
]);
export const TERMINAL_STATES: ReadonlySet<JobState> = new Set([
	"completed",
	"failed",
	"cancelled",
]);

export async function listJobs(): Promise<JobInfo[]> {
	const response = await fetch("/api/jobs");
	if (!response.ok) throw new Error("Saaya's job list is unreachable.");
	return response.json();
}

export async function fetchJob(id: string): Promise<JobDetail> {
	const response = await fetch(`/api/jobs/${id}`);
	if (!response.ok) throw new Error("This job could not be loaded.");
	return response.json();
}

export async function createJob(
	goal: string,
	threadId?: string,
): Promise<JobInfo> {
	const response = await fetch("/api/jobs", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ goal, thread_id: threadId ?? null }),
	});
	if (!response.ok) throw new Error("The job could not be created.");
	return response.json();
}

export async function cancelJob(id: string): Promise<void> {
	const response = await fetch(`/api/jobs/${id}/cancel`, {
		method: "POST",
	});
	if (!response.ok) throw new Error("This job can no longer be cancelled.");
}

export async function retryJob(id: string): Promise<void> {
	const response = await fetch(`/api/jobs/${id}/retry`, {
		method: "POST",
	});
	if (!response.ok) throw new Error("This job cannot be retried from here.");
}

export function jobEventsUrl(id: string, afterSeq: number): string {
	return `/api/jobs/${id}/events?after_seq=${afterSeq}`;
}

// Human labels for ledger rows. Anything unknown falls back to the raw type,
// so a new backend event is never invisible.
export function eventLabel(event: JobEvent): string {
	switch (event.type) {
		case "job_created":
			return "Job created";
		case "state_changed":
			return `Moved from ${event.payload.from} to ${event.payload.to}`;
		case "plan_created":
			return `Plan created with ${event.payload.count} steps`;
		case "step_started":
			return `Step ${event.payload.n} started`;
		case "step_completed":
			return `Step ${event.payload.n} completed`;
		case "step_failed":
			return `Step ${event.payload.n} failed`;
		case "budget_exhausted":
			return "Budget exhausted";
		case "policy_refused":
			return "A workspace boundary held";
		case "job_recovered":
			return "Recovered after a restart";
		case "worker_error":
			return "The worker hit an error";
		case "job_completed":
			return "Job completed";
		default:
			return event.type.replaceAll("_", " ");
	}
}

export const STATE_LABEL: Record<JobState, string> = {
	draft: "Draft",
	queued: "Queued",
	planning: "Planning",
	waiting_approval: "Waiting on you",
	running: "Running",
	paused: "Paused",
	blocked: "Blocked",
	retrying: "Retrying",
	failed: "Failed",
	cancelled: "Cancelled",
	completed: "Completed",
};
