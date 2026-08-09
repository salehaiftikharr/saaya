"use client";

import { ArrowDown, BriefcaseBusiness, PanelRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { AppSidebar, type AppView } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { ToolsPanel } from "@/components/tools/tools-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkPanel } from "@/components/work/work-panel";
import {
	JobBench,
	pickActiveJob,
	useAllJobs,
	Workbench,
} from "@/components/work/workbench";
import { useHealth } from "@/lib/use-health";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";
import { ContinuityStrip } from "./continuity-strip";
import { Message } from "./message";
import { useChat } from "./use-chat";

export function ChatApp() {
	// Written each render from the health poll; read by useChat at failure
	// time so offline turns get honest copy without a re-render dependency.
	const offlineRef = useRef(false);
	const {
		messages,
		status,
		loadError,
		continuity,
		threads,
		activeThread,
		send,
		newConversation,
		switchThread,
		rename,
		archive,
		refreshThreads,
		stop,
		retry,
	} = useChat(offlineRef);
	const [view, setView] = useState<AppView>("chat");
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [nearBottom, setNearBottom] = useState(true);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const scrollHostRef = useRef<HTMLDivElement | null>(null);

	const health = useHealth();
	offlineRef.current = health.offline;

	// Recovery refreshes what the outage may have hidden (F6): the thread
	// list returns as soon as the health poll sees the server again.
	const wasOffline = useRef(false);
	useEffect(() => {
		if (wasOffline.current && !health.offline) refreshThreads();
		wasOffline.current = health.offline;
	}, [health.offline, refreshThreads]);

	// The workbench opens when the conversation owns work and reveals itself
	// when work starts mid-thread; a close wins until the thread changes.
	const allJobs = useAllJobs();
	const threadJobs = allJobs.filter((job) => job.thread_id === activeThread);
	const [benchOpen, setBenchOpen] = useState(false);
	const benchClosed = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: this is a reset-on-thread-change effect; the thread id is the trigger, not an input
	useEffect(() => {
		benchClosed.current = false;
		setBenchOpen(false);
	}, [activeThread]);
	useEffect(() => {
		if (threadJobs.length > 0 && !benchClosed.current) setBenchOpen(true);
		if (threadJobs.length === 0) setBenchOpen(false);
	}, [threadJobs.length]);

	const viewport = () =>
		scrollHostRef.current?.querySelector<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		) ?? null;

	// Readers who scroll up stay where they are; only near-bottom readers
	// follow the stream.
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll reacts to transcript growth, not to the sentinel's identity
	useEffect(() => {
		if (nearBottom) bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messages, nearBottom]);

	useEffect(() => {
		const host = viewport();
		if (!host) return;
		const onScroll = () => {
			setNearBottom(
				host.scrollHeight - host.scrollTop - host.clientHeight < 120,
			);
		};
		onScroll();
		host.addEventListener("scroll", onScroll, { passive: true });
		return () => host.removeEventListener("scroll", onScroll);
	});

	const jumpToLatest = () => {
		bottomRef.current?.scrollIntoView({ block: "end" });
		setNearBottom(true);
	};

	const working = status === "working";
	const lastMessage = messages[messages.length - 1];
	const liveState = working
		? lastMessage?.activities.some((a) => a.state === "running")
			? "Using a tool"
			: "Thinking"
		: "";
	const activeTitle =
		threads.find((t) => t.id === activeThread)?.title ??
		(messages.length > 0 ? "Conversation" : "New conversation");
	const hasWaitingJob = threadJobs.some(
		(job) => job.state === "waiting_approval",
	);
	const hasLiveJob = threadJobs.some((job) =>
		["planning", "running", "retrying"].includes(job.state),
	);
	// An unreachable server outranks everything; then streaming turns; then
	// the conversation's job activity: waiting beats working beats idle.
	const echoState = health.offline
		? ("offline" as const)
		: working
			? lastMessage?.activities.some((a) => a.state === "running")
				? ("tool" as const)
				: ("thinking" as const)
			: hasWaitingJob
				? ("waiting-approval" as const)
				: hasLiveJob
					? ("working" as const)
					: ("idle" as const);

	const crumb =
		view === "memory"
			? "Memory"
			: view === "tools"
				? "Tools"
				: view === "work"
					? "Work"
					: activeTitle;

	const selectThread = (id: string) => {
		setView("chat");
		switchThread(id);
	};
	const startNew = () => {
		setView("chat");
		newConversation();
	};

	return (
		<SidebarProvider>
			<AppSidebar
				threads={threads}
				activeThread={activeThread}
				disabled={working}
				jobs={allJobs}
				view={view}
				echoState={echoState}
				healthSnapshot={health.offline ? "offline" : (health.surfaces ?? {})}
				onSelectView={setView}
				onSelectThread={selectThread}
				onNewConversation={startNew}
				onRename={rename}
				onArchive={archive}
				onRestored={refreshThreads}
				onOpenPalette={() => setPaletteOpen(true)}
			/>
			<SidebarInset className="h-svh overflow-hidden">
				<div className="flex h-full min-h-0 min-w-0 flex-col">
					<AppTopbar
						crumb={crumb}
						live={view === "chat" ? liveState : undefined}
						onHome={startNew}
						actions={
							<>
								{view === "chat" && threadJobs.length > 0 && !benchOpen && (
									<Button
										variant="ghost"
										size="icon"
										className="hidden lg:inline-flex"
										aria-label="Open the workbench"
										onClick={() => {
											benchClosed.current = false;
											setBenchOpen(true);
										}}
									>
										<PanelRight className="size-4" />
									</Button>
								)}
								{view === "chat" && threadJobs.length > 0 && (
									<Sheet>
										<SheetTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													className="relative lg:hidden"
													aria-label="Workbench"
												>
													<BriefcaseBusiness className="size-4" />
													<span
														aria-hidden
														className={cn(
															"absolute top-1 right-1 size-1.5 rounded-full",
															hasWaitingJob ? "bg-amber-500" : "bg-primary",
														)}
													/>
												</Button>
											}
										/>
										<SheetContent
											side="right"
											className="flex h-full min-h-0 w-[88vw] max-w-md flex-col p-0 pb-[env(safe-area-inset-bottom)]"
										>
											<SheetHeader className="border-b px-4 py-3">
												<SheetTitle className="type-eyebrow text-sm">
													Workbench
												</SheetTitle>
											</SheetHeader>
											<div className="min-h-0 flex-1 overflow-y-auto">
												{pickActiveJob(threadJobs) && (
													<JobBench
														jobId={pickActiveJob(threadJobs)?.id ?? ""}
													/>
												)}
											</div>
										</SheetContent>
									</Sheet>
								)}
							</>
						}
					/>
					<div className="flex min-h-0 min-w-0 flex-1">
						<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
							{view === "memory" ? (
								<div className="min-h-0 flex-1 overflow-y-auto">
									<MemoryPanel />
								</div>
							) : view === "tools" ? (
								<div className="min-h-0 flex-1 overflow-y-auto">
									<ToolsPanel />
								</div>
							) : view === "work" ? (
								<div className="min-h-0 flex-1 overflow-y-auto">
									<WorkPanel />
								</div>
							) : (
								<>
									{loadError && (
										<p className="border-b bg-accent px-4 py-2 text-accent-foreground text-sm">
											{loadError}
										</p>
									)}
									{messages.length === 0 ? (
										<section
											className="flex flex-1 flex-col items-center justify-center gap-5 p-8"
											aria-label="Empty conversation"
										>
											<SaayaMark className="size-12 text-foreground" />
											<div className="max-w-sm text-center">
												<h1 className="type-display text-4xl">
													Start a conversation
												</h1>
												<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
													The coworker that stays. What you say here survives
													restarts, and what Saaya learns carries forward.
												</p>
											</div>
											<fieldset
												className="flex flex-wrap justify-center gap-2"
												aria-label="Suggestions"
											>
												{[
													"What time is it right now?",
													"Remember that our team demo is on Thursdays.",
													"What do you remember about how I work?",
												].map((suggestion) => (
													<Button
														key={suggestion}
														variant="outline"
														size="sm"
														className="font-normal"
														disabled={working}
														onClick={() => send(suggestion)}
													>
														{suggestion}
													</Button>
												))}
											</fieldset>
										</section>
									) : (
										<div
											ref={scrollHostRef}
											className="relative min-h-0 flex-1"
										>
											{!nearBottom && (
												<Button
													variant="secondary"
													size="sm"
													onClick={jumpToLatest}
													className="-translate-x-1/2 absolute bottom-3 left-1/2 z-10 gap-1.5 shadow-sm"
												>
													<ArrowDown className="size-3.5" />
													Jump to latest
												</Button>
											)}
											<ScrollArea className="h-full min-h-0">
												<div
													role="log"
													aria-label="Conversation"
													className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6"
												>
													<ContinuityStrip items={continuity} />
													{messages.map((message, index) => (
														<Message
															key={message.id}
															message={message}
															streaming={
																working && index === messages.length - 1
															}
															onRetry={
																message.error && index === messages.length - 1
																	? retry
																	: undefined
															}
														/>
													))}
													<div ref={bottomRef} />
												</div>
											</ScrollArea>
										</div>
									)}
									<Composer
										disabled={working}
										working={working}
										offline={health.offline}
										threadId={activeThread}
										onSend={send}
										onStop={stop}
									/>
								</>
							)}
						</div>
						{view === "chat" && benchOpen && (
							<Workbench
								jobs={threadJobs}
								onClose={() => {
									benchClosed.current = true;
									setBenchOpen(false);
								}}
							/>
						)}
					</div>
				</div>
			</SidebarInset>
			<CommandPalette
				threads={threads}
				open={paletteOpen}
				onOpenChange={setPaletteOpen}
				onSelectThread={selectThread}
				onSelectView={(v) => setView(v)}
				onNewConversation={startNew}
			/>
		</SidebarProvider>
	);
}
