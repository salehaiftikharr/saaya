"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readWireEvents } from "@/lib/sse";
import type { TranscriptMessage } from "@/lib/wire-events";
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
	const threadRef = useRef<string | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(THREAD_KEY);
		if (!stored) return;
		threadRef.current = stored;
		fetch(`/api/chat/${stored}/messages`)
			.then(async (response) => {
				if (!response.ok) throw new Error(`status ${response.status}`);
				const transcript = (await response.json()) as TranscriptMessage[];
				setMessages(fromTranscript(transcript));
			})
			.catch(() => {
				setLoadError("Could not load the earlier conversation.");
			});
	}, []);

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
			} finally {
				setStatus("idle");
			}
		},
		[status, updateLast],
	);

	const newConversation = useCallback(() => {
		if (status === "working") return;
		threadRef.current = null;
		localStorage.removeItem(THREAD_KEY);
		setMessages([]);
		setLoadError(null);
	}, [status]);

	return { messages, status, loadError, send, newConversation };
}
