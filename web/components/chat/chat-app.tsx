"use client";

import {
	ArrowDown,
	Brain,
	BriefcaseBusiness,
	History,
	MessageSquarePlus,
	PanelRight,
	Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EchoMark } from "@/components/brand/echo-mark";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { SurfaceStatus } from "@/components/shell/surface-status";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ToolsPanel } from "@/components/tools/tools-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { WorkPanel } from "@/components/work/work-panel";
import { useAllJobs, Workbench } from "@/components/work/workbench";
import { Composer } from "./composer";
import { ContinuityStrip } from "./continuity-strip";
import { Message } from "./message";
import { ThreadList } from "./thread-list";
import { useChat } from "./use-chat";

export function ChatApp() {
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
		stop,
		retry,
	} = useChat();
	const [view, setView] = useState<"chat" | "memory" | "tools" | "work">(
		"chat",
	);
	const [nearBottom, setNearBottom] = useState(true);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const scrollHostRef = useRef<HTMLDivElement | null>(null);

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
	const echoState = working
		? lastMessage?.activities.some((a) => a.state === "running")
			? ("tool" as const)
			: ("thinking" as const)
		: ("idle" as const);

	return (
		<div className="flex h-dvh w-full overflow-hidden">
			<aside className="hidden h-full min-h-0 w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
				<div className="flex h-14 items-center gap-2.5 px-4">
					<EchoMark state={echoState} className="size-5" />
					<span className="font-semibold text-sm tracking-tight">saaya</span>
				</div>
				<Separator />
				<div className="flex flex-col gap-1 p-3">
					<Button
						variant="outline"
						className="justify-start gap-2"
						onClick={() => {
							setView("chat");
							newConversation();
						}}
						disabled={working || messages.length === 0}
					>
						<MessageSquarePlus className="size-4" />
						New conversation
					</Button>
					<Button
						variant={view === "memory" ? "secondary" : "ghost"}
						className="justify-start gap-2"
						aria-pressed={view === "memory"}
						onClick={() => setView(view === "memory" ? "chat" : "memory")}
					>
						<Brain className="size-4" />
						Memory
					</Button>
					<Button
						variant={view === "work" ? "secondary" : "ghost"}
						className="justify-start gap-2"
						aria-pressed={view === "work"}
						onClick={() => setView(view === "work" ? "chat" : "work")}
					>
						<BriefcaseBusiness className="size-4" />
						Work
					</Button>
					<Button
						variant={view === "tools" ? "secondary" : "ghost"}
						className="justify-start gap-2"
						aria-pressed={view === "tools"}
						onClick={() => setView(view === "tools" ? "chat" : "tools")}
					>
						<Wrench className="size-4" />
						Tools
					</Button>
				</div>
				<ThreadList
					threads={threads}
					activeThread={activeThread}
					disabled={working}
					jobs={allJobs}
					onSelect={(id) => {
						setView("chat");
						switchThread(id);
					}}
					onRename={rename}
					onArchive={archive}
				/>
				<div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<SurfaceStatus />
					<a
						href="/about"
						className="shrink-0 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
					>
						About
					</a>
				</div>
			</aside>
			<main className="flex h-full min-h-0 flex-1 flex-col">
				<header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
					<div className="flex min-w-0 items-center gap-2.5">
						<SaayaMark className="size-5 shrink-0 md:hidden" />
						<span className="truncate font-medium text-sm">
							{view === "memory"
								? "Memory"
								: view === "tools"
									? "Tools"
									: view === "work"
										? "Work"
										: activeTitle}
						</span>
						<span
							className="shrink-0 text-muted-foreground text-xs"
							aria-live="polite"
						>
							{view === "chat" ? liveState : ""}
						</span>
					</div>
					<div className="flex items-center gap-1">
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
						<Sheet>
							<SheetTrigger
								render={
									<Button
										variant="ghost"
										size="icon"
										className="md:hidden"
										aria-label="Conversation history"
									>
										<History className="size-4" />
									</Button>
								}
							/>
							<SheetContent
								side="left"
								className="flex h-full min-h-0 w-80 flex-col p-0 pb-[env(safe-area-inset-bottom)]"
							>
								<SheetHeader className="border-b px-4 py-3">
									<SheetTitle className="text-sm">Conversations</SheetTitle>
								</SheetHeader>
								<ThreadList
									threads={threads}
									activeThread={activeThread}
									disabled={working}
									onSelect={(id) => {
										setView("chat");
										switchThread(id);
									}}
									onRename={rename}
									onArchive={archive}
								/>
							</SheetContent>
						</Sheet>
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden"
							aria-label="New conversation"
							onClick={() => {
								setView("chat");
								newConversation();
							}}
							disabled={working || messages.length === 0}
						>
							<MessageSquarePlus className="size-4" />
						</Button>
						<Button
							variant={view === "memory" ? "secondary" : "ghost"}
							size="icon"
							className="md:hidden"
							aria-label="Memory"
							aria-pressed={view === "memory"}
							onClick={() => setView(view === "memory" ? "chat" : "memory")}
						>
							<Brain className="size-4" />
						</Button>
						<Button
							variant={view === "work" ? "secondary" : "ghost"}
							size="icon"
							className="md:hidden"
							aria-label="Work"
							aria-pressed={view === "work"}
							onClick={() => setView(view === "work" ? "chat" : "work")}
						>
							<BriefcaseBusiness className="size-4" />
						</Button>
						<Button
							variant={view === "tools" ? "secondary" : "ghost"}
							size="icon"
							className="md:hidden"
							aria-label="Tools"
							aria-pressed={view === "tools"}
							onClick={() => setView(view === "tools" ? "chat" : "tools")}
						>
							<Wrench className="size-4" />
						</Button>
						<ThemeToggle />
					</div>
				</header>
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
							<div ref={scrollHostRef} className="relative min-h-0 flex-1">
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
										className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6"
									>
										<ContinuityStrip items={continuity} />
										{messages.map((message, index) => (
											<Message
												key={message.id}
												message={message}
												streaming={working && index === messages.length - 1}
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
							threadId={activeThread}
							onSend={send}
							onStop={stop}
						/>
					</>
				)}
			</main>
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
	);
}
