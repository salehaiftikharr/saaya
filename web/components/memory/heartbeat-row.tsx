import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeartbeatRunInfo {
	name: string;
	outcome: string;
	detail: string;
	started_at: string;
	finished_at: string | null;
}

export function HeartbeatRow({ run }: { run: HeartbeatRunInfo }) {
	const failed = run.outcome === "failed";
	return (
		<li className="flex items-center gap-3 rounded-lg border bg-card p-3">
			<Activity
				aria-hidden
				className={cn(
					"size-4 shrink-0",
					failed ? "text-destructive" : "text-primary",
				)}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm">
					<span className="font-mono">{run.name}</span>
					<span
						className={cn(
							"ml-2 rounded px-1.5 py-0.5 text-xs",
							failed
								? "bg-destructive/10 text-destructive"
								: "bg-accent text-accent-foreground",
						)}
					>
						{run.outcome}
					</span>
				</p>
				{run.detail !== "" && (
					<p className="truncate text-muted-foreground text-xs">{run.detail}</p>
				)}
			</div>
			<time
				dateTime={run.started_at}
				className="shrink-0 text-muted-foreground text-xs"
			>
				{new Date(run.started_at).toLocaleTimeString()}
			</time>
		</li>
	);
}
