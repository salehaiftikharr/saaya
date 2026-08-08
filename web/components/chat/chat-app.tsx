"use client";

import { Brain, MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Composer } from "./composer";
import { Message } from "./message";
import { useChat } from "./use-chat";

export function ChatApp() {
	const { messages, status, loadError, send, newConversation } = useChat();
	const [view, setView] = useState<"chat" | "memory">("chat");
	const bottomRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll reacts to transcript growth, not to the sentinel's identity
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messages]);

	const working = status === "working";

	return (
		<div className="flex min-h-dvh w-full">
			<aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
				<div className="flex h-14 items-center gap-2.5 px-4">
					<SaayaMark className="size-5" />
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
				</div>
				<p className="mt-auto px-4 pb-4 text-muted-foreground text-xs">
					Conversations survive restarts. Close this tab and come back; Saaya
					picks up where you left off.
				</p>
			</aside>
			<main className="flex h-dvh flex-1 flex-col">
				<header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
					<span className="text-muted-foreground text-sm" aria-live="polite">
						{view === "memory" ? "Memory" : working ? "Working" : "Ready"}
					</span>
					<ThemeToggle />
				</header>
				{view === "memory" ? (
					<div className="flex-1 overflow-y-auto">
						<MemoryPanel />
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
								className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
								aria-label="Empty conversation"
							>
								<SaayaMark className="size-14 text-foreground" />
								<div className="max-w-sm text-center">
									<h1 className="font-semibold text-lg tracking-tight">
										Start a conversation
									</h1>
									<p className="mt-1 text-muted-foreground text-sm">
										Saaya remembers this thread across restarts. Ask for the
										time to watch a tool run.
									</p>
								</div>
							</section>
						) : (
							<ScrollArea className="flex-1">
								<div
									role="log"
									aria-label="Conversation"
									className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6"
								>
									{messages.map((message, index) => (
										<Message
											key={message.id}
											message={message}
											streaming={working && index === messages.length - 1}
										/>
									))}
									<div ref={bottomRef} />
								</div>
							</ScrollArea>
						)}
						<Composer disabled={working} onSend={send} />
					</>
				)}
			</main>
		</div>
	);
}
