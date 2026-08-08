"use client";

import { type JobState, STATE_LABEL } from "@/lib/jobs-api";
import { cn } from "@/lib/utils";

const TONE: Record<JobState, string> = {
	draft: "bg-muted text-muted-foreground",
	queued: "bg-muted text-muted-foreground",
	planning: "bg-accent text-accent-foreground",
	waiting_approval:
		"bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
	running: "bg-accent text-accent-foreground",
	paused: "bg-muted text-muted-foreground",
	blocked: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
	retrying: "bg-accent text-accent-foreground",
	failed: "bg-destructive/10 text-destructive",
	cancelled: "bg-muted text-muted-foreground",
	completed: "bg-primary/10 text-primary",
};

export function JobStateBadge({ state }: { state: JobState }) {
	const live =
		state === "running" || state === "planning" || state === "retrying";
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-[11px]",
				TONE[state],
			)}
		>
			{live && (
				<span
					aria-hidden
					className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none"
				/>
			)}
			{STATE_LABEL[state]}
		</span>
	);
}
