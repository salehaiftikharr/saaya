"use client";

import { PanelRightClose } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
	LIVE_STATES,
	listJobs,
} from "@/lib/jobs-api";

// The conversation-owned working surface, adapted from Rendi: it opens when
// the conversation owns work, reveals itself when work starts mid-thread,
// and a hand that closed it wins for the rest of the session. Everything it
// renders is the persisted ledger.

export function useThreadJobs(threadId: string | null): JobInfo[] {
	const [jobs, setJobs] = useState<JobInfo[]>([]);

	useEffect(() => {
		if (!threadId) {
			setJobs([]);
			return;
		}
		let cancelled = false;
		const load = () => {
			listJobs()
				.then((all) => {
					if (!cancelled) {
						setJobs(all.filter((job) => job.thread_id === threadId));
					}
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
	}, [threadId]);

	return jobs;
}

function JobBench({ jobId }: { jobId: string }) {
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

	useEffect(() => {
		if (!detail || !LIVE_STATES.has(detail.job.state)) return;
		const timer = setInterval(load, 1500);
		return () => clearInterval(timer);
	}, [detail, load]);

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
	return (
		<div className="flex flex-col gap-4 px-4 py-4">
			<div className="flex flex-col gap-2">
				<JobStateBadge state={job.state} />
				<p className="text-sm leading-relaxed">{job.goal}</p>
				{job.error && (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{job.error}
					</p>
				)}
			</div>
			{pending.map((approval) => (
				<ApprovalCard key={approval.id} approval={approval} onDecide={decide} />
			))}
			{artifacts.length > 0 && (
				<section aria-label="Artifacts" className="flex flex-col gap-2">
					<h3 className="type-eyebrow">Artifacts</h3>
					<ArtifactList artifacts={artifacts} />
				</section>
			)}
			<section aria-label="Job progress" className="flex flex-col gap-2">
				<h3 className="type-eyebrow">Progress</h3>
				<JobTimeline events={events} />
			</section>
		</div>
	);
}

export function Workbench({
	jobs,
	onClose,
}: {
	jobs: JobInfo[];
	onClose: () => void;
}) {
	const active =
		jobs.find((job) => LIVE_STATES.has(job.state)) ??
		jobs.find((job) => job.state === "waiting_approval") ??
		jobs[0];
	if (!active) return null;
	const others = jobs.length - 1;
	return (
		<aside
			aria-label="Workbench"
			className="hidden h-full min-h-0 w-[24rem] shrink-0 flex-col border-l bg-background lg:flex xl:w-[27rem]"
		>
			<div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
				<span className="type-eyebrow">Workbench</span>
				<div className="ml-auto flex items-center">
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
