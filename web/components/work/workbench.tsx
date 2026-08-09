"use client";

import { ChevronDown, PanelRightClose, UnfoldHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApprovalCard } from "@/components/work/approval-card";
import { ArtifactList } from "@/components/work/artifact-list";
import { JobStateBadge } from "@/components/work/job-state-badge";
import { JobTimeline } from "@/components/work/job-timeline";
import {
	decideApproval,
	fetchJob,
	type JobDetail,
	type JobInfo,
	jobEventsUrl,
	LIVE_STATES,
	listJobs,
	TERMINAL_STATES,
} from "@/lib/jobs-api";
import { cn } from "@/lib/utils";

// The conversation-owned working surface, adapted from Rendi: it opens when
// the conversation owns work, reveals itself when work starts mid-thread,
// and a hand that closed it wins for the rest of the session. Everything it
// renders is the persisted ledger.

export function useAllJobs(): JobInfo[] {
	const [jobs, setJobs] = useState<JobInfo[]>([]);

	useEffect(() => {
		let cancelled = false;
		const load = () => {
			listJobs()
				.then((all) => {
					if (!cancelled) setJobs(all);
				})
				.catch(() => {});
		};
		load();
		const timer = setInterval(() => {
			if (document.visibilityState === "visible") load();
		}, 4000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	return jobs;
}

export function pickActiveJob(jobs: JobInfo[]): JobInfo | undefined {
	return (
		jobs.find((job) => LIVE_STATES.has(job.state)) ??
		jobs.find((job) => job.state === "waiting_approval") ??
		jobs[0]
	);
}

export type PlanStepStatus = "pending" | "running" | "done" | "failed";

function planFromEvents(
	events: { type: string; payload: Record<string, unknown> }[],
): { intent: string; status: PlanStepStatus }[] {
	const planEvent = [...events]
		.reverse()
		.find((event) => event.type === "plan_created");
	const steps = (planEvent?.payload.steps ?? []) as { intent?: string }[];
	if (!Array.isArray(steps) || steps.length === 0) return [];
	const status: PlanStepStatus[] = steps.map(() => "pending");
	for (const event of events) {
		const n = Number(event.payload?.n);
		if (!Number.isInteger(n) || n < 1 || n > steps.length) continue;
		if (event.type === "step_started") status[n - 1] = "running";
		if (event.type === "step_completed") status[n - 1] = "done";
		if (event.type === "step_failed") status[n - 1] = "failed";
	}
	return steps.map((step, index) => ({
		intent: String(step.intent ?? ""),
		status: status[index],
	}));
}

function BenchBlock({
	label,
	children,
	defaultOpen = true,
}: {
	label: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
}) {
	return (
		<Collapsible
			defaultOpen={defaultOpen}
			className="rounded-lg border bg-card"
		>
			<CollapsibleTrigger className="group/block flex w-full items-center gap-2 px-3 py-2 text-left">
				<span className="type-eyebrow">{label}</span>
				<ChevronDown className="ml-auto size-3.5 text-muted-foreground transition-transform group-data-[panel-open]/block:rotate-0 group-not-data-[panel-open]/block:-rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t px-3 py-2.5">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}

export function JobBench({ jobId }: { jobId: string }) {
	const [detail, setDetail] = useState<JobDetail | null>(null);

	const load = useCallback(() => {
		fetchJob(jobId)
			.then(setDetail)
			.catch(() => {});
	}, [jobId]);

	useEffect(() => {
		setDetail(null);
		load();
	}, [load]);

	// The ledger tail replaces polling: the SSE stream carries the same
	// persisted rows the snapshot returns, so each arriving row triggers one
	// snapshot refresh, and a dropped stream reconnects with backoff.
	const seqRef = useRef(0);
	useEffect(() => {
		seqRef.current = detail?.job.last_event_seq ?? 0;
	}, [detail]);
	const streaming = detail ? !TERMINAL_STATES.has(detail.job.state) : false;
	useEffect(() => {
		if (!streaming) return;
		let source: EventSource | null = null;
		let retry: ReturnType<typeof setTimeout> | undefined;
		let stopped = false;
		const open = () => {
			if (stopped) return;
			source = new EventSource(jobEventsUrl(jobId, seqRef.current));
			source.onmessage = (message) => {
				try {
					const row = JSON.parse(message.data) as {
						seq?: number;
						type?: string;
					};
					if (typeof row.seq === "number") seqRef.current = row.seq;
					if (row.type === "end_of_stream") {
						stopped = true;
						source?.close();
					}
				} catch {
					// Malformed frames still trigger a snapshot refresh below.
				}
				load();
			};
			source.onerror = () => {
				source?.close();
				if (!stopped) retry = setTimeout(open, 2500);
			};
		};
		open();
		return () => {
			stopped = true;
			source?.close();
			clearTimeout(retry);
		};
	}, [streaming, jobId, load]);

	// waiting_approval is not in LIVE_STATES, but a decision arrives from
	// this panel, so refresh right after deciding.
	const decide = useCallback(
		async (approvalId: string, decision: "approved" | "rejected") => {
			try {
				await decideApproval(jobId, approvalId, decision);
				toast(
					decision === "approved"
						? "Approved; the job continues"
						: "Rejected; Saaya will work around it",
				);
			} catch (failure) {
				toast.error(
					String(failure instanceof Error ? failure.message : failure),
				);
			} finally {
				load();
			}
		},
		[jobId, load],
	);

	if (!detail) {
		return <p className="px-4 py-3 text-muted-foreground text-sm">Loading…</p>;
	}
	const { job, events, approvals, artifacts } = detail;
	const pending = approvals.filter((approval) => approval.decision === null);
	const plan = planFromEvents(events);
	const handoff = [...events]
		.reverse()
		.find((event) => event.type === "job_completed");
	return (
		<div className="flex flex-col gap-3 px-4 py-4">
			<div className="flex flex-col gap-2">
				<JobStateBadge state={job.state} />
				<details className="group">
					<summary className="cursor-pointer list-none">
						<p className="line-clamp-3 text-sm leading-relaxed group-open:hidden">
							{job.goal}
						</p>
						<span className="text-muted-foreground text-xs underline-offset-4 hover:underline group-open:hidden">
							Show the full goal
						</span>
					</summary>
					<p className="text-sm leading-relaxed">{job.goal}</p>
				</details>
				{job.error && (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{job.error}
					</p>
				)}
			</div>
			{pending.map((approval) => (
				<ApprovalCard key={approval.id} approval={approval} onDecide={decide} />
			))}
			{plan.length > 0 && (
				<BenchBlock label="Plan">
					<ol className="flex flex-col gap-1.5">
						{plan.map((step, index) => (
							<li
								key={`step-${String(index + 1)}:${step.intent.slice(0, 24)}`}
								className="flex items-start gap-2 text-sm leading-snug"
							>
								<span
									aria-hidden
									className={cn(
										"mt-1.5 size-1.5 shrink-0 rounded-full",
										step.status === "done"
											? "bg-primary"
											: step.status === "running"
												? "bg-primary animate-pulse motion-reduce:animate-none"
												: step.status === "failed"
													? "bg-destructive"
													: "bg-border",
									)}
								/>
								<span
									className={cn(
										step.status === "done" && "text-muted-foreground",
										step.status === "failed" && "text-destructive",
									)}
								>
									{step.intent}
									<span className="sr-only">{`, ${step.status}`}</span>
								</span>
							</li>
						))}
					</ol>
				</BenchBlock>
			)}
			{artifacts.length > 0 && (
				<BenchBlock label="Artifacts">
					<ArtifactList artifacts={artifacts} />
				</BenchBlock>
			)}
			{handoff && (
				<BenchBlock label="Outcome">
					<p className="text-muted-foreground text-sm leading-relaxed">
						Completed {String(handoff.payload.steps_completed ?? "")} steps.
						{artifacts.length > 0 &&
							` ${artifacts.length} ${artifacts.length === 1 ? "artifact" : "artifacts"} registered.`}
					</p>
				</BenchBlock>
			)}
			<BenchBlock label="Progress" defaultOpen={!handoff}>
				<JobTimeline events={events} />
			</BenchBlock>
		</div>
	);
}

const WIDE_KEY = "saaya:bench:wide";

export function Workbench({
	jobs,
	onClose,
}: {
	jobs: JobInfo[];
	onClose: () => void;
}) {
	// The width choice is meaningful workbench state: it survives reloads.
	const [wide, setWide] = useState(false);
	useEffect(() => {
		setWide(localStorage.getItem(WIDE_KEY) === "1");
	}, []);
	const toggleWide = () => {
		setWide((current) => {
			const next = !current;
			localStorage.setItem(WIDE_KEY, next ? "1" : "0");
			return next;
		});
	};
	const active = pickActiveJob(jobs);
	if (!active) return null;
	const others = jobs.length - 1;
	return (
		<aside
			aria-label="Workbench"
			className={cn(
				"hidden h-full min-h-0 shrink-0 flex-col border-l bg-background lg:flex",
				wide ? "w-[36rem] xl:w-[40rem]" : "w-[24rem] xl:w-[27rem]",
			)}
		>
			<div className="flex h-13 shrink-0 items-center gap-2 border-b px-4">
				<span className="type-eyebrow">Workbench</span>
				<div className="ml-auto flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-muted-foreground"
						aria-label={wide ? "Narrow the workbench" : "Widen the workbench"}
						onClick={toggleWide}
					>
						<UnfoldHorizontal className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-muted-foreground"
						aria-label="Close the workbench"
						onClick={onClose}
					>
						<PanelRightClose className="size-3.5" />
					</Button>
				</div>
			</div>
			<ScrollArea className="h-full min-h-0">
				<JobBench jobId={active.id} />
				{others > 0 && (
					<p className="px-4 pb-4 text-muted-foreground text-xs">
						{others} earlier {others === 1 ? "job" : "jobs"} from this
						conversation {others === 1 ? "is" : "are"} in Work.
					</p>
				)}
			</ScrollArea>
		</aside>
	);
}
