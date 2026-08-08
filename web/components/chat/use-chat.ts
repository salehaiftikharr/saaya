"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { readWireEvents } from "@/lib/sse";
import {
	archiveThread,
	fetchThreads,
	renameThread,
	type ThreadInfo,
} from "@/lib/threads-api";
import type { TranscriptMessage } from "@/lib/wire-events";
import type { ContextItem } from "./continuity-strip";
import type { ChatMessage } from "./message";

const THREAD_KEY = "saaya.thread";

export type ChatStatus = "idle" | "working";

function fromTranscript(entries: TranscriptMessage[]): ChatMessage[] {
	return entries.map((entry, index) => ({
		id: `history-${index}`,
		role: entry.role,
		text: entry.text,
		activities: [],
	}));
}

export function useChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [status, setStatus] = useState<ChatStatus>("idle");
	const [loadError, setLoadError] = useState<string | null>(null);
	const [continuity, setContinuity] = useState<ContextItem[]>([]);
	const [threads, setThreads] = useState<ThreadInfo[]>([]);
	const [activeThread, setActiveThread] = useState<string | null>(null);
	const threadRef = useRef<string | null>(null);

	const refreshThreads = useCallback(() => {
		fetchThreads()
			.then(setThreads)
			.catch(() => setThreads([]));
	}, []);

	const loadThread = useCallback((threadId: string) => {
		threadRef.current = threadId;
		setActiveThread(threadId);
		localStorage.setItem(THREAD_KEY, threadId);
		setLoadError(null);
		setContinuity([]);
		fetch(`/api/chat/${threadId}/messages`)
			.then(async (response) => {
				if (!response.ok) throw new Error(`status ${response.status}`);
				const transcript = (await response.json()) as TranscriptMessage[];
				setMessages(fromTranscript(transcript));
				if (transcript.length > 0) {
					fetch(`/api/chat/${threadId}/context`)
						.then(async (contextResponse) => {
							if (!contextResponse.ok) return;
							setContinuity((await contextResponse.json()) as ContextItem[]);
						})
						.catch(() => {});
				}
			})
			.catch(() => {
				setLoadError("Could not load the earlier conversation.");
			});
	}, []);

	useEffect(() => {
		refreshThreads();
		const stored = localStorage.getItem(THREAD_KEY);
		if (stored) loadThread(stored);
	}, [refreshThreads, loadThread]);

	const updateLast = useCallback(
		(update: (message: ChatMessage) => ChatMessage) => {
			setMessages((current) => {
				if (current.length === 0) return current;
				const next = current.slice(0, -1);
				next.push(update(current[current.length - 1] as ChatMessage));
				return next;
			});
		},
		[],
	);

	const send = useCallback(
		async (text: string) => {
			if (status === "working") return;
			setStatus("working");
			setLoadError(null);
			setMessages((current) => [
				...current,
				{ id: crypto.randomUUID(), role: "user", text, activities: [] },
				{
					id: crypto.randomUUID(),
					role: "assistant",
					text: "",
					activities: [],
				},
			]);
			try {
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						text,
						thread_id: threadRef.current ?? undefined,
					}),
				});
				if (!response.ok || !response.body) {
					throw new Error(
						`The server answered with status ${response.status}.`,
					);
				}
				for await (const event of readWireEvents(response.body)) {
					if (event.event === "thread.started") {
						threadRef.current = event.thread_id;
						setActiveThread(event.thread_id);
						localStorage.setItem(THREAD_KEY, event.thread_id);
					} else if (event.event === "text.delta") {
						updateLast((m) => ({ ...m, text: m.text + event.text }));
					} else if (event.event === "tool.started") {
						updateLast((m) => ({
							...m,
							activities: [
								...m.activities,
								{
									id: crypto.randomUUID(),
									name: event.name,
									state: "running" as const,
								},
							],
						}));
					} else if (event.event === "tool.finished") {
						updateLast((m) => ({
							...m,
							activities: m.activities.map((activity) =>
								activity.state === "running" && activity.name === event.name
									? {
											...activity,
											state: "done" as const,
											outputPreview: event.output_preview,
										}
									: activity,
							),
						}));
					} else if (event.event === "turn.error") {
						updateLast((m) => ({ ...m, error: event.message }));
					}
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "The request failed.";
				updateLast((m) => ({ ...m, error: message }));
				toast("Connection interrupted", {
					description: "The turn ended early; send again to continue.",
				});
			} finally {
				setStatus("idle");
				refreshThreads();
			}
		},
		[status, updateLast, refreshThreads],
	);

	const newConversation = useCallback(() => {
		if (status === "working") return;
		threadRef.current = null;
		setActiveThread(null);
		localStorage.removeItem(THREAD_KEY);
		setMessages([]);
		setContinuity([]);
		setLoadError(null);
	}, [status]);

	const switchThread = useCallback(
		(threadId: string) => {
			if (status === "working" || threadId === threadRef.current) return;
			loadThread(threadId);
		},
		[status, loadThread],
	);

	const rename = useCallback(
		async (threadId: string, title: string) => {
			try {
				await renameThread(threadId, title);
				refreshThreads();
			} catch {
				toast("Rename failed", { description: "Try again in a moment." });
			}
		},
		[refreshThreads],
	);

	const archive = useCallback(
		async (threadId: string) => {
			try {
				await archiveThread(threadId);
				if (threadRef.current === threadId) {
					threadRef.current = null;
					setActiveThread(null);
					localStorage.removeItem(THREAD_KEY);
					setMessages([]);
					setContinuity([]);
				}
				refreshThreads();
				toast("Conversation archived", {
					description: "The transcript and what Saaya learned are kept.",
				});
			} catch {
				toast("Archive failed", { description: "Try again in a moment." });
			}
		},
		[refreshThreads],
	);

	return {
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
	};
}
