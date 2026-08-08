"use client";

import { Check, ChevronRight, CircleSlash, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ToolActivity {
	id: string;
	name: string;
	state: "running" | "done";
	outputPreview?: string;
}

type Group = {
	name: string;
	calls: ToolActivity[];
	running: boolean;
};

function groupByName(activities: ToolActivity[]): Group[] {
	const groups: Group[] = [];
	const index = new Map<string, Group>();
	for (const activity of activities) {
		let group = index.get(activity.name);
		if (!group) {
			group = { name: activity.name, calls: [], running: false };
			index.set(activity.name, group);
			groups.push(group);
		}
		group.calls.push(activity);
		group.running ||= activity.state === "running";
	}
	return groups;
}

// Repeated calls to the same tool collapse into one structured item: state,
// name, count, and a result preview, with each call's output behind a
// disclosure. A "running" state with no live stream is a dead turn and says
// interrupted instead of spinning forever.
function ActivityItem({ group, live }: { group: Group; live: boolean }) {
	const [open, setOpen] = useState(false);
	const interrupted = group.running && !live;
	const lastPreview = [...group.calls]
		.reverse()
		.find((call) => call.outputPreview)?.outputPreview;
	const summary = interrupted
		? "interrupted"
		: group.running
			? "running"
			: (lastPreview ?? "finished");
	const expandable = group.calls.some((call) => call.outputPreview);
	return (
		<div className="rounded-md border bg-card">
			<button
				type="button"
				disabled={!expandable}
				aria-expanded={expandable ? open : undefined}
				onClick={() => expandable && setOpen((current) => !current)}
				className={cn(
					"flex w-full items-center gap-2 px-2.5 py-1.5 text-left",
					expandable && "hover:bg-muted/40",
				)}
			>
				{interrupted ? (
					<CircleSlash
						aria-hidden
						className="size-3 shrink-0 text-muted-foreground"
					/>
				) : group.running ? (
					<Loader2
						aria-hidden
						className="size-3 shrink-0 animate-spin motion-reduce:animate-none"
					/>
				) : (
					<Check aria-hidden className="size-3 shrink-0 text-primary" />
				)}
				<span className="shrink-0 font-mono text-foreground text-xs">
					{group.name}
				</span>
				{group.calls.length > 1 && (
					<span className="shrink-0 rounded-full bg-secondary px-1.5 font-mono text-[10.5px] text-secondary-foreground">
						x{group.calls.length}
					</span>
				)}
				<span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
					{summary}
				</span>
				<span className="sr-only">
					{interrupted ? "interrupted" : group.running ? "running" : "finished"}
				</span>
				{expandable && (
					<ChevronRight
						aria-hidden
						className={cn(
							"ml-auto size-3 shrink-0 text-muted-foreground transition-transform",
							open && "rotate-90",
						)}
					/>
				)}
			</button>
			{open && (
				<ol className="flex flex-col gap-1 border-t px-2.5 py-1.5">
					{group.calls.map((call, index) => (
						<li
							key={call.id}
							className="flex items-baseline gap-2 font-mono text-[11px] text-muted-foreground"
						>
							<span className="shrink-0 tabular-nums">{index + 1}.</span>
							<span className="min-w-0 break-words">
								{call.outputPreview ??
									(call.state === "running" ? "no result yet" : "no output")}
							</span>
						</li>
					))}
				</ol>
			)}
		</div>
	);
}

export function ToolActivityList({
	activities,
	live = false,
}: {
	activities: ToolActivity[];
	live?: boolean;
}) {
	if (activities.length === 0) return null;
	return (
		<div className="flex flex-col gap-1">
			{groupByName(activities).map((group) => (
				<ActivityItem key={group.name} group={group} live={live} />
			))}
		</div>
	);
}
