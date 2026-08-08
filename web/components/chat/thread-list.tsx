"use client";

import {
	Hash,
	MessageCircle,
	MoreHorizontal,
	Plug,
	Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { JobInfo, JobState } from "@/lib/jobs-api";
import {
	GROUP_ORDER,
	groupForTimestamp,
	relativeTime,
	type ThreadInfo,
} from "@/lib/threads-api";
import { cn } from "@/lib/utils";

const SOURCE_BADGES: Partial<
	Record<ThreadInfo["source"], { label: string; icon: typeof Plug }>
> = {
	"slack-dm": { label: "Slack DM", icon: MessageCircle },
	"slack-thread": { label: "Slack thread", icon: Hash },
	mcp: { label: "MCP", icon: Plug },
};

// The one work state a row leads with; liveness beats history.
function dominantJobState(jobs: JobInfo[]): JobState | null {
	const order: JobState[] = [
		"waiting_approval",
		"running",
		"planning",
		"retrying",
		"queued",
		"blocked",
		"failed",
		"completed",
	];
	for (const state of order) {
		if (jobs.some((job) => job.state === state)) return state;
	}
	return null;
}

const JOB_DOT: Partial<Record<JobState, { className: string; label: string }>> =
	{
		waiting_approval: {
			className: "bg-amber-500",
			label: "a job is waiting on you",
		},
		running: {
			className: "bg-primary animate-pulse motion-reduce:animate-none",
			label: "a job is running",
		},
		planning: {
			className: "bg-primary animate-pulse motion-reduce:animate-none",
			label: "a job is planning",
		},
		retrying: {
			className: "bg-primary animate-pulse motion-reduce:animate-none",
			label: "a job is retrying",
		},
		queued: { className: "bg-muted-foreground", label: "a job is queued" },
		blocked: { className: "bg-amber-500", label: "a job is blocked" },
		failed: { className: "bg-destructive", label: "a job failed" },
		completed: { className: "bg-primary/50", label: "a job completed" },
	};

export function ThreadList({
	threads,
	activeThread,
	disabled,
	jobs = [],
	onSelect,
	onRename,
	onArchive,
}: {
	threads: ThreadInfo[];
	activeThread: string | null;
	disabled: boolean;
	jobs?: JobInfo[];
	onSelect: (id: string) => void;
	onRename: (id: string, title: string) => void;
	onArchive: (id: string) => void;
}) {
	const [query, setQuery] = useState("");
	const [renaming, setRenaming] = useState<ThreadInfo | null>(null);
	const [renameDraft, setRenameDraft] = useState("");
	const [archiving, setArchiving] = useState<ThreadInfo | null>(null);

	const grouped = useMemo(() => {
		const q = query.trim().toLowerCase();
		const visible = q
			? threads.filter((t) => t.title.toLowerCase().includes(q))
			: threads;
		const byGroup = new Map<string, ThreadInfo[]>();
		for (const thread of visible) {
			const group = groupForTimestamp(thread.last_activity_at);
			byGroup.set(group, [...(byGroup.get(group) ?? []), thread]);
		}
		return { visible, byGroup };
	}, [threads, query]);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="px-3 pb-1">
				<div className="relative">
					<Search
						aria-hidden
						className="-translate-y-1/2 absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
					/>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search conversations"
						aria-label="Search conversations"
						className="h-8 pl-8 text-sm"
					/>
				</div>
			</div>
			<nav
				aria-label="Conversations"
				className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2"
			>
				{grouped.visible.length === 0 && (
					<p className="px-1 py-2 text-muted-foreground text-xs">
						{query ? `Nothing matches "${query}".` : "No conversations yet."}
					</p>
				)}
				{GROUP_ORDER.map((group) => {
					const items = grouped.byGroup.get(group);
					if (!items || items.length === 0) return null;
					return (
						<div key={group} className="flex flex-col gap-0.5">
							<p className="type-eyebrow px-1 pt-2 pb-1">{group}</p>
							{items.map((thread) => {
								const badge = SOURCE_BADGES[thread.source];
								const active = thread.id === activeThread;
								const jobState = dominantJobState(
									jobs.filter((job) => job.thread_id === thread.id),
								);
								const dot = jobState ? JOB_DOT[jobState] : undefined;
								return (
									<div
										key={thread.id}
										className={cn(
											"group relative flex items-center rounded-md",
											active ? "bg-secondary" : "hover:bg-secondary/50",
										)}
									>
										<button
											type="button"
											onClick={() => onSelect(thread.id)}
											disabled={disabled}
											aria-current={active ? "true" : undefined}
											title={new Date(thread.last_activity_at).toLocaleString()}
											className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
										>
											<span className="flex w-full items-center gap-1.5">
												{dot && (
													<span
														className={cn(
															"size-1.5 shrink-0 rounded-full",
															dot.className,
														)}
													>
														<span className="sr-only">{dot.label}</span>
													</span>
												)}
												<span className="min-w-0 truncate text-sm">
													{thread.title}
												</span>
											</span>
											<span
												className={cn(
													"flex items-center gap-1.5 text-xs",
													active
														? "text-secondary-foreground/80"
														: "text-muted-foreground",
												)}
											>
												{relativeTime(thread.last_activity_at)}
												{badge && (
													<span className="inline-flex items-center gap-1">
														<badge.icon aria-hidden className="size-3" />
														{badge.label}
													</span>
												)}
											</span>
										</button>
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button
														variant="ghost"
														size="icon"
														aria-label={`Actions for ${thread.title}`}
														className="mr-1 size-7 opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
													>
														<MoreHorizontal className="size-4" />
													</Button>
												}
											/>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => {
														setRenaming(thread);
														setRenameDraft(thread.title);
													}}
												>
													Rename
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onClick={() => setArchiving(thread)}
												>
													Archive
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								);
							})}
						</div>
					);
				})}
			</nav>

			<Dialog
				open={renaming !== null}
				onOpenChange={(open) => !open && setRenaming(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename conversation</DialogTitle>
					</DialogHeader>
					<Input
						value={renameDraft}
						onChange={(event) => setRenameDraft(event.target.value)}
						aria-label="Conversation title"
						maxLength={80}
						onKeyDown={(event) => {
							if (event.key === "Enter" && renaming && renameDraft.trim()) {
								onRename(renaming.id, renameDraft.trim());
								setRenaming(null);
							}
						}}
					/>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setRenaming(null)}>
							Cancel
						</Button>
						<Button
							disabled={!renameDraft.trim()}
							onClick={() => {
								if (renaming) onRename(renaming.id, renameDraft.trim());
								setRenaming(null);
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={archiving !== null}
				onOpenChange={(open) => !open && setArchiving(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Archive "{archiving?.title}"?</AlertDialogTitle>
						<AlertDialogDescription>
							The conversation leaves this list. Its transcript stays stored,
							and anything Saaya learned from it is kept.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep it</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (archiving) onArchive(archiving.id);
								setArchiving(null);
							}}
						>
							Archive
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
