"use client";

import {
	Archive,
	Brain,
	BriefcaseBusiness,
	ChevronDown,
	Hash,
	MessageCircle,
	MoreHorizontal,
	Plug,
	Plus,
	Search,
	Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EchoMark, type EchoState } from "@/components/brand/echo-mark";
import { SurfaceStatus } from "@/components/shell/surface-status";
import { ThemeToggle } from "@/components/shell/theme-toggle";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import type { JobInfo, JobState } from "@/lib/jobs-api";
import {
	fetchArchivedThreads,
	GROUP_ORDER,
	groupForTimestamp,
	restoreThread,
	type ThreadInfo,
} from "@/lib/threads-api";
import { cn } from "@/lib/utils";

export type AppView = "chat" | "memory" | "tools" | "work";

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

const VIEWS: { view: AppView; label: string; icon: typeof Brain }[] = [
	{ view: "memory", label: "Memory", icon: Brain },
	{ view: "work", label: "Work", icon: BriefcaseBusiness },
	{ view: "tools", label: "Tools", icon: Wrench },
];

export function AppSidebar({
	threads,
	activeThread,
	disabled,
	jobs,
	view,
	echoState,
	onSelectView,
	onSelectThread,
	onNewConversation,
	onRename,
	onArchive,
	onRestored,
	onOpenPalette,
	healthSnapshot,
}: {
	threads: ThreadInfo[];
	activeThread: string | null;
	disabled: boolean;
	jobs: JobInfo[];
	view: AppView;
	echoState: EchoState;
	onSelectView: (view: AppView) => void;
	onSelectThread: (id: string) => void;
	onNewConversation: () => void;
	onRename: (id: string, title: string) => void;
	onArchive: (id: string) => void;
	onRestored: () => void;
	onOpenPalette: () => void;
	healthSnapshot?: Record<string, string> | "offline";
}) {
	const [query, setQuery] = useState("");
	const [renaming, setRenaming] = useState<ThreadInfo | null>(null);
	const [renameDraft, setRenameDraft] = useState("");
	const [archiving, setArchiving] = useState<ThreadInfo | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [archived, setArchived] = useState<ThreadInfo[] | null>(null);
	const loadArchived = () => {
		fetchArchivedThreads()
			.then(setArchived)
			.catch(() => setArchived([]));
	};

	const anyWaiting = jobs.some((job) => job.state === "waiting_approval");
	const searching = query.trim().length > 0;

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
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex items-center gap-2.5 px-2 pt-1 pb-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<EchoMark state={echoState} className="size-5 shrink-0" />
					<span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden">
						saaya
					</span>
				</div>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip="New conversation"
							disabled={disabled}
							onClick={onNewConversation}
						>
							<Plus className="text-primary" />
							<span>New conversation</span>
						</SidebarMenuButton>
						<SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>⇧</Kbd>
								<Kbd>O</Kbd>
							</KbdGroup>
						</SidebarMenuBadge>
					</SidebarMenuItem>
					{/* The rail keeps search one click away: the palette IS the
					    collapsed search surface. */}
					<SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
						<SidebarMenuButton
							tooltip="Search conversations"
							onClick={onOpenPalette}
						>
							<Search />
							<span>Search</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{VIEWS.map(({ view: v, label, icon: Icon }) => (
						<SidebarMenuItem key={v}>
							<SidebarMenuButton
								tooltip={label}
								isActive={view === v}
								onClick={() => onSelectView(view === v ? "chat" : v)}
							>
								<Icon />
								<span>{label}</span>
							</SidebarMenuButton>
							{v === "work" && anyWaiting && (
								<SidebarMenuBadge>
									<span className="size-1.5 rounded-full bg-amber-500">
										<span className="sr-only">a job is waiting on you</span>
									</span>
								</SidebarMenuBadge>
							)}
						</SidebarMenuItem>
					))}
				</SidebarMenu>
				<SidebarInput
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search conversations"
					aria-label="Search conversations"
					className="group-data-[collapsible=icon]:hidden"
				/>
			</SidebarHeader>

			<SidebarContent>
				{searching ? (
					<SidebarGroup>
						<SidebarGroupLabel>Matches</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="gap-1">
								{grouped.visible.length === 0 && (
									<li className="px-2 py-1.5 text-sidebar-foreground/60 text-sm">
										No matches.
									</li>
								)}
								{grouped.visible.map((thread) => (
									<ThreadRow
										key={thread.id}
										thread={thread}
										active={thread.id === activeThread}
										disabled={disabled}
										jobs={jobs}
										onSelect={onSelectThread}
										onRenameOpen={(t) => {
											setRenaming(t);
											setRenameDraft(t.title);
										}}
										onArchiveOpen={setArchiving}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : (
					GROUP_ORDER.map((group) => {
						const items = grouped.byGroup.get(group);
						if (!items || items.length === 0) return null;
						return (
							<SidebarGroup key={group}>
								<SidebarGroupLabel>{group}</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu className="gap-1">
										{items.map((thread) => (
											<ThreadRow
												key={thread.id}
												thread={thread}
												active={thread.id === activeThread}
												disabled={disabled}
												jobs={jobs}
												onSelect={onSelectThread}
												onRenameOpen={(t) => {
													setRenaming(t);
													setRenameDraft(t.title);
												}}
												onArchiveOpen={setArchiving}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						);
					})
				)}
				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									aria-expanded={showArchived}
									onClick={() => {
										const next = !showArchived;
										setShowArchived(next);
										if (next) loadArchived();
									}}
									className="text-sidebar-foreground/70"
								>
									<Archive />
									<span>Archived</span>
									<ChevronDown
										className={cn(
											"ml-auto transition-transform",
											!showArchived && "-rotate-90",
										)}
									/>
								</SidebarMenuButton>
							</SidebarMenuItem>
							{showArchived &&
								(archived === null ? (
									<li className="px-2 py-1.5 text-sidebar-foreground/60 text-xs">
										Loading…
									</li>
								) : archived.length === 0 ? (
									<li className="px-2 py-1.5 text-sidebar-foreground/60 text-xs">
										Nothing is archived.
									</li>
								) : (
									archived.map((thread) => (
										<SidebarMenuItem key={thread.id}>
											<div className="flex items-center gap-2 rounded-md px-2 py-1">
												<span className="min-w-0 flex-1 truncate text-sidebar-foreground/70 text-sm">
													{thread.title}
												</span>
												<Button
													variant="ghost"
													size="sm"
													className="h-6 shrink-0 px-2 text-xs"
													onClick={async () => {
														try {
															await restoreThread(thread.id);
															loadArchived();
															onRestored();
														} catch {
															// The row stays; the next attempt can succeed.
														}
													}}
												>
													Restore
												</Button>
											</div>
										</SidebarMenuItem>
									))
								))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<div className="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<div className="group-data-[collapsible=icon]:hidden">
						<SurfaceStatus snapshot={healthSnapshot} />
					</div>
					<div className="flex items-center gap-1.5">
						<a
							href="/about"
							className="text-sidebar-foreground/60 text-xs underline-offset-4 hover:text-sidebar-foreground hover:underline group-data-[collapsible=icon]:hidden"
						>
							About
						</a>
						<ThemeToggle />
					</div>
				</div>
			</SidebarFooter>
			<SidebarRail />

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
							The conversation leaves this list but nothing is deleted: the
							transcript and anything Saaya learned from it remain, and you can
							restore it from Archived below.
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
		</Sidebar>
	);
}

function ThreadRow({
	thread,
	active,
	disabled,
	jobs,
	onSelect,
	onRenameOpen,
	onArchiveOpen,
}: {
	thread: ThreadInfo;
	active: boolean;
	disabled: boolean;
	jobs: JobInfo[];
	onSelect: (id: string) => void;
	onRenameOpen: (thread: ThreadInfo) => void;
	onArchiveOpen: (thread: ThreadInfo) => void;
}) {
	const badge = SOURCE_BADGES[thread.source];
	const jobState = dominantJobState(
		jobs.filter((job) => job.thread_id === thread.id),
	);
	const dot = jobState ? JOB_DOT[jobState] : undefined;
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={active}
				disabled={disabled}
				tooltip={thread.title}
				onClick={() => onSelect(thread.id)}
				title={new Date(thread.last_activity_at).toLocaleString()}
			>
				<span className="flex size-4 shrink-0 items-center justify-center">
					{dot ? (
						<span className={cn("size-2 rounded-full", dot.className)}>
							<span className="sr-only">{dot.label}</span>
						</span>
					) : badge ? (
						<badge.icon
							aria-hidden
							className="size-3.5 text-sidebar-foreground/50"
						/>
					) : (
						<span
							className={cn(
								"size-2 rounded-full",
								active ? "bg-primary" : "bg-muted-foreground/50",
							)}
						/>
					)}
				</span>
				<span className="truncate">{thread.title}</span>
				{badge && <span className="sr-only">{badge.label}</span>}
			</SidebarMenuButton>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<SidebarMenuAction
							showOnHover
							aria-label={`Actions for ${thread.title}`}
						>
							<MoreHorizontal />
						</SidebarMenuAction>
					}
				/>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => onRenameOpen(thread)}>
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => onArchiveOpen(thread)}
					>
						Archive
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}
