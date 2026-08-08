import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeartbeatRunInfo {
	name: string;
	outcome: string;
	detail: string;
	started_at: string;
	finished_at: string | null;
}

export function heartbeatOutcomeSentence(run: HeartbeatRunInfo): string {
	if (run.outcome === "failed") {
		return "A heartbeat failed; Saaya retries on the next beat.";
	}
	if (run.detail.includes("applied")) {
		return "Saaya updated its working knowledge from recent conversations.";
	}
	if (run.detail.includes("rejected")) {
		return "A proposed memory change was checked and turned away.";
	}
	return "Saaya looked at recent work; nothing needed to change.";
}

export function HeartbeatRow({ run }: { run: HeartbeatRunInfo }) {
	const failed = run.outcome === "failed";
	return (
		<li className="flex items-start gap-3 rounded-lg border bg-card p-3">
			<Activity
				aria-hidden
				className={cn(
					"mt-0.5 size-4 shrink-0",
					failed ? "text-destructive" : "text-primary",
				)}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-relaxed">
					{heartbeatOutcomeSentence(run)}
				</p>
				<details>
					<summary className="cursor-pointer text-muted-foreground text-xs">
						Run record
					</summary>
					<p className="mt-1.5 font-mono text-muted-foreground text-xs">
						{run.name} - {run.outcome}
						{run.detail ? ` - ${run.detail}` : ""} -{" "}
						{new Date(run.started_at).toLocaleString()}
					</p>
				</details>
			</div>
		</li>
	);
}
