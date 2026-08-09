"use client";

import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "@/lib/ai-parts";

export interface ToolActivity {
	id: string;
	name: string;
	state: "running" | "done";
	outputPreview?: string;
	startedAt?: number;
	durationMs?: number;
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

function totalDuration(group: Group): string | null {
	const known = group.calls
		.map((call) => call.durationMs)
		.filter((ms): ms is number => typeof ms === "number");
	if (known.length === 0) return null;
	const total = known.reduce((sum, ms) => sum + ms, 0);
	return total < 1000 ? `${total}ms` : `${(total / 1000).toFixed(1)}s`;
}

// Repeated calls to the same tool collapse into one structured item on the
// ported Tool disclosure: state badge, name, count, duration when measured,
// and a result preview, with each call's output behind the disclosure. A
// running group with no live stream belongs to a dead turn and says
// interrupted instead of spinning forever.
function ActivityItem({ group, live }: { group: Group; live: boolean }) {
	const interrupted = group.running && !live;
	const state: ToolUIPart["state"] = interrupted
		? "interrupted"
		: group.running
			? "input-available"
			: "output-available";
	const lastPreview = [...group.calls]
		.reverse()
		.find((call) => call.outputPreview)?.outputPreview;
	const duration = totalDuration(group);
	const summaryParts = [
		group.calls.length > 1 ? `x${group.calls.length}` : "",
		duration ?? "",
		interrupted ? "" : (lastPreview ?? ""),
	].filter(Boolean);
	return (
		<Tool className="bg-card">
			<ToolHeader
				type={`tool-${group.name}`}
				state={state}
				title={group.name}
				summary={
					summaryParts.length > 0 ? (
						<span className="min-w-0 truncate font-mono text-muted-foreground text-xs">
							{summaryParts.join(" · ")}
						</span>
					) : undefined
				}
			/>
			<ToolContent>
				<ol className="flex flex-col gap-1.5 border-t px-3 py-2">
					{group.calls.map((call, index) => (
						<li
							key={call.id}
							className="flex items-baseline gap-2 font-mono text-muted-foreground text-xs"
						>
							<span className="shrink-0 tabular-nums">{index + 1}.</span>
							<span className="min-w-0 break-words">
								{call.outputPreview ??
									(call.state === "running"
										? interrupted
											? "no result arrived"
											: "no result yet"
										: "no output")}
							</span>
							{typeof call.durationMs === "number" && (
								<span className="ml-auto shrink-0 tabular-nums">
									{call.durationMs < 1000
										? `${call.durationMs}ms`
										: `${(call.durationMs / 1000).toFixed(1)}s`}
								</span>
							)}
						</li>
					))}
				</ol>
			</ToolContent>
		</Tool>
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
		<div className="flex flex-col gap-1.5">
			{groupByName(activities).map((group) => (
				<ActivityItem key={group.name} group={group} live={live} />
			))}
		</div>
	);
}
