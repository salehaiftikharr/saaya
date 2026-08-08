"use client";

import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	CircleDashed,
	FileText,
	ListChecks,
	Play,
	RotateCcw,
	ShieldAlert,
} from "lucide-react";
import { eventLabel, type JobEvent, type PlanStep } from "@/lib/jobs-api";
import { cn } from "@/lib/utils";

// One ledger row, rendered the Rendi way: a human-readable line first, the
// technical payload behind a disclosure. Everything shown here is persisted;
// nothing renders that is not in the ledger.

function icon(type: string) {
	switch (type) {
		case "plan_created":
			return ListChecks;
		case "step_started":
			return Play;
		case "step_completed":
			return CheckCircle2;
		case "step_failed":
		case "worker_error":
			return AlertTriangle;
		case "budget_exhausted":
			return CircleDashed;
		case "policy_refused":
			return ShieldAlert;
		case "job_recovered":
			return RotateCcw;
		case "job_completed":
			return CheckCircle2;
		case "state_changed":
			return ArrowRight;
		default:
			return FileText;
	}
}

function tone(type: string): string {
	if (type === "step_failed" || type === "worker_error") {
		return "text-destructive";
	}
	if (type === "policy_refused" || type === "budget_exhausted") {
		return "text-amber-600 dark:text-amber-500";
	}
	if (type === "job_completed") return "text-primary";
	return "text-muted-foreground";
}

function summaryLine(event: JobEvent): string | null {
	if (event.type === "step_started") {
		return String(event.payload.intent ?? "");
	}
	if (event.type === "step_completed") {
		const text = String(event.payload.summary ?? "");
		return text.length > 160 ? `${text.slice(0, 160)}…` : text;
	}
	if (event.type === "step_failed" || event.type === "worker_error") {
		return String(event.payload.error ?? "");
	}
	if (event.type === "policy_refused") {
		return String(event.payload.detail ?? "");
	}
	if (event.type === "plan_created") {
		const steps = event.payload.steps as PlanStep[] | undefined;
		return (
			steps?.map((step, i) => `${i + 1}. ${step.intent}`).join("\n") ?? null
		);
	}
	return null;
}

function timeOf(iso: string): string {
	return new Date(iso).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function JobTimeline({ events }: { events: JobEvent[] }) {
	return (
		<ol className="flex flex-col gap-0.5" aria-label="Job event ledger">
			{events.map((event) => {
				const Icon = icon(event.type);
				const summary = summaryLine(event);
				return (
					<li
						key={event.seq}
						className="group flex gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50"
					>
						<Icon
							className={cn("mt-0.5 size-3.5 shrink-0", tone(event.type))}
						/>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-sm">{eventLabel(event)}</span>
								<span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">
									{timeOf(event.at)}
								</span>
							</div>
							{summary && (
								<p className="whitespace-pre-line text-muted-foreground text-xs leading-relaxed">
									{summary}
								</p>
							)}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
