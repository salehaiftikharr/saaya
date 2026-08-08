"use client";

import { ArrowLeft, FileText, OctagonX, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ApprovalCard } from "@/components/work/approval-card";
import { ArtifactList } from "@/components/work/artifact-list";
import { JobStateBadge } from "@/components/work/job-state-badge";
import { JobTimeline } from "@/components/work/job-timeline";
import { fetchHealth, type JobsHealth } from "@/lib/health-api";
import {
	cadenceSentence,
	cancelJob,
	decideApproval,
	fetchJob,
	type JobDetail,
	type JobInfo,
	LIVE_STATES,
	listJobs,
	listSchedules,
	retryJob,
	type ScheduleInfo,
	setScheduleEnabled,
	untilTime,
} from "@/lib/jobs-api";
import { relativeTime } from "@/lib/threads-api";

// The Work surface: durable Jobs with their persisted ledgers. While a job
// is live the open detail polls the same rows the SSE tail carries, so what
// renders after a refresh or a full restart is identical to what streamed.

export function WorkPanel() {
	const [jobs, setJobs] = useState<JobInfo[]>([]);
	const [detail, setDetail] = useState<JobDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [ops, setOps] = useState<JobsHealth | null>(null);
	const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
	const openId = useRef<string | null>(null);

	const loadSchedules = useCallback(() => {
		listSchedules()
			.then(setSchedules)
			.catch(() => {});
	}, []);

	useEffect(() => {
		loadSchedules();
	}, [loadSchedules]);

	const toggleSchedule = useCallback(
		async (schedule: ScheduleInfo, enabled: boolean) => {
			try {
				await setScheduleEnabled(schedule.id, enabled);
				toast(
					enabled
						? `${schedule.name} is on; next fire counts from now`
						: `${schedule.name} is paused`,
				);
			} catch (failure) {
				toast.error(
					String(failure instanceof Error ? failure.message : failure),
				);
			} finally {
				loadSchedules();
			}
		},
		[loadSchedules],
	);

	useEffect(() => {
		let cancelled = false;
		const poll = () => {
			fetchHealth()
				.then((health) => {
					if (!cancelled) setOps(health.jobs ?? null);
				})
				.catch(() => {
					if (!cancelled) setOps(null);
				});
		};
		poll();
		const timer = setInterval(poll, 15_000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	const loadList = useCallback(() => {
		listJobs()
			.then(setJobs)
			.catch(() => setError("Could not load jobs."));
	}, []);

	const open = useCallback((id: string) => {
		openId.current = id;
		fetchJob(id)
			.then((data) => {
				if (openId.current === id) setDetail(data);
			})
			.catch(() => setError("This job could not be loaded."));
	}, []);

	useEffect(() => {
		loadList();
	}, [loadList]);

	// A live open job refreshes from persistence until it settles.
	useEffect(() => {
		const id = detail?.job.id;
		if (!id || !LIVE_STATES.has(detail.job.state)) return;
		const timer = setInterval(() => {
			fetchJob(id)
				.then((data) => {
					if (openId.current === id) setDetail(data);
				})
				.catch(() => {});
		}, 1500);
		return () => clearInterval(timer);
	}, [detail]);

	const act = useCallback(
		async (action: "cancel" | "retry", id: string) => {
			try {
				await (action === "cancel" ? cancelJob(id) : retryJob(id));
				toast(action === "cancel" ? "Cancel recorded" : "Retry started");
				open(id);
				loadList();
			} catch (failure) {
				toast.error(
					String(failure instanceof Error ? failure.message : failure),
				);
			}
		},
		[open, loadList],
	);

	const decide = useCallback(
		async (approvalId: string, decision: "approved" | "rejected") => {
			const id = openId.current;
			if (!id) return;
			try {
				await decideApproval(id, approvalId, decision);
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
				open(id);
			}
		},
		[open],
	);

	if (detail) {
		const { job, events, approvals, artifacts } = detail;
		const files = events.findLast((e) => e.type === "job_completed")?.payload
			.files as { path: string; size: number }[] | undefined;
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Back to all jobs"
						onClick={() => {
							openId.current = null;
							setDetail(null);
							loadList();
						}}
					>
						<ArrowLeft className="size-4" />
					</Button>
					<h2 className="type-eyebrow">Job</h2>
					<span className="ml-auto">
						<JobStateBadge state={job.state} />
					</span>
				</div>
				<p className="text-sm leading-relaxed">{job.goal}</p>
				{job.error && (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
						{job.error}
					</p>
				)}
				<div className="flex items-center gap-2">
					{LIVE_STATES.has(job.state) && (
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => act("cancel", job.id)}
						>
							<OctagonX className="size-3.5" />
							Stop this job
						</Button>
					)}
					{(job.state === "failed" || job.state === "blocked") && (
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => act("retry", job.id)}
						>
							<RotateCcw className="size-3.5" />
							Retry from where it stopped
						</Button>
					)}
				</div>
				{approvals
					.filter((approval) => approval.decision === null)
					.map((approval) => (
						<ApprovalCard
							key={approval.id}
							approval={approval}
							onDecide={decide}
						/>
					))}
				{artifacts.length > 0 && (
					<section aria-label="Artifacts" className="flex flex-col gap-2">
						<h3 className="type-eyebrow">Artifacts</h3>
						<ArtifactList artifacts={artifacts} />
					</section>
				)}
				<section aria-label="What happened" className="flex flex-col gap-2">
					<h3 className="type-eyebrow">What happened</h3>
					<JobTimeline events={events} />
				</section>
				{files && files.length > 0 && (
					<section aria-label="Files produced" className="flex flex-col gap-2">
						<h3 className="type-eyebrow">Files in the workspace</h3>
						<ul className="flex flex-col gap-1">
							{files.map((file) => (
								<li
									key={file.path}
									className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
								>
									<FileText className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="min-w-0 truncate font-mono text-xs">
										{file.path}
									</span>
									<span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">
										{file.size} B
									</span>
								</li>
							))}
						</ul>
					</section>
				)}
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
			<h2 className="type-eyebrow">Work</h2>
			<p className="text-muted-foreground text-sm">
				Durable jobs with their own workspace and a full event ledger. A job
				survives restarts and resumes where it stopped; everything below is read
				from that ledger.
			</p>
			{ops && (
				<p className="rounded-md border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
					worker {ops.worker} · {ops.queued} queued · {ops.live} live ·{" "}
					{ops.waiting} waiting on you
				</p>
			)}
			{error && (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			)}
			{schedules.length > 0 && (
				<section aria-label="Schedules" className="flex flex-col gap-2">
					<h3 className="type-eyebrow">Schedules</h3>
					<ul className="flex flex-col gap-1.5">
						{schedules.map((schedule) => (
							<li
								key={schedule.id}
								className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">{schedule.name}</p>
									<p className="text-muted-foreground text-xs">
										{cadenceSentence(schedule)}
										{schedule.enabled &&
											` · next ${untilTime(schedule.next_fire_at)}`}
										{schedule.last_job_id && (
											<>
												{" · "}
												<button
													type="button"
													className="underline underline-offset-4 hover:text-foreground"
													onClick={() =>
														schedule.last_job_id && open(schedule.last_job_id)
													}
												>
													last run
												</button>
											</>
										)}
									</p>
								</div>
								<Switch
									checked={schedule.enabled}
									aria-label={`${schedule.name} enabled`}
									onCheckedChange={(next) => toggleSchedule(schedule, next)}
								/>
							</li>
						))}
					</ul>
				</section>
			)}
			{jobs.length === 0 && !error ? (
				<p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
					No jobs yet. Ask Saaya for something substantial and it can run as a
					job that keeps going after you close the tab.
				</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{jobs.map((job) => (
						<li key={job.id}>
							<button
								type="button"
								onClick={() => open(job.id)}
								className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-muted/50"
							>
								<span className="min-w-0 flex-1 truncate text-sm">
									{job.goal}
								</span>
								<span className="shrink-0 text-[10.5px] text-muted-foreground">
									{relativeTime(job.created_at)}
								</span>
								<JobStateBadge state={job.state} />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
