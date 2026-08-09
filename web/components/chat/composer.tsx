"use client";

import { useEffect, useRef } from "react";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputProvider,
	PromptInputSubmit,
	PromptInputTextarea,
	usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "@/lib/ai-parts";

function draftKey(threadId: string | null): string {
	return `saaya:draft:${threadId ?? "new"}`;
}

// Typed text survives switching conversations: each thread keeps its own
// draft in sessionStorage, restored through the prompt controller when the
// thread returns. Lives inside the provider so the textarea stays the
// single source of truth.
function DraftSync({ threadId }: { threadId: string | null }) {
	const { textInput } = usePromptInputController();
	const loadedFor = useRef<string | null>("__none__");

	useEffect(() => {
		if (loadedFor.current === threadId) return;
		loadedFor.current = threadId;
		textInput.setInput(sessionStorage.getItem(draftKey(threadId)) ?? "");
	}, [threadId, textInput]);

	useEffect(() => {
		if (loadedFor.current !== threadId) return;
		if (textInput.value) {
			sessionStorage.setItem(draftKey(threadId), textInput.value);
		} else {
			sessionStorage.removeItem(draftKey(threadId));
		}
	}, [textInput.value, threadId]);

	return null;
}

export function Composer({
	disabled,
	working = false,
	offline = false,
	threadId = null,
	onSend,
	onStop,
}: {
	disabled: boolean;
	working?: boolean;
	offline?: boolean;
	threadId?: string | null;
	onSend: (text: string) => void;
	onStop?: () => void;
}) {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const submitting = useRef(false);
	const wasWorking = useRef(false);

	// Focus returns to the composer when a turn ends, so the follow-up can
	// be typed without a click.
	useEffect(() => {
		if (wasWorking.current && !working) {
			textareaRef.current?.focus({ preventScroll: true });
		}
		wasWorking.current = working;
	}, [working]);

	const status: ChatStatus = working ? "streaming" : "ready";
	const placeholder = offline
		? "Reconnecting to Saaya…"
		: working
			? "Saaya is working…"
			: "Message Saaya";

	return (
		<div className="shrink-0 px-4 pb-4 md:px-6 md:pb-5">
			<PromptInputProvider>
				<DraftSync threadId={threadId} />
				<PromptInput
					className="mx-auto max-w-3xl rounded-xl bg-card shadow-xs"
					onSubmit={({ text }) => {
						// The submitting latch swallows the double-fire window
						// between Enter and React's state flush, so one message
						// never sends twice.
						const trimmed = text?.trim();
						if (!trimmed || disabled || offline || submitting.current) {
							return;
						}
						submitting.current = true;
						sessionStorage.removeItem(draftKey(threadId));
						onSend(trimmed);
						setTimeout(() => {
							submitting.current = false;
						}, 300);
					}}
				>
					<PromptInputBody>
						<PromptInputTextarea
							ref={textareaRef}
							className="min-h-12"
							placeholder={placeholder}
							aria-label="Message Saaya"
							disabled={disabled || offline}
						/>
					</PromptInputBody>
					<PromptInputFooter className="justify-between gap-2">
						<span className="whitespace-nowrap text-[10px] text-muted-foreground">
							Enter to send, Shift+Enter for a new line
						</span>
						{working && onStop ? (
							<PromptInputSubmit
								status={status}
								type="button"
								onClick={onStop}
								aria-label="Stop the reply"
							/>
						) : (
							<PromptInputSubmit status={status} aria-label="Send" />
						)}
					</PromptInputFooter>
				</PromptInput>
			</PromptInputProvider>
		</div>
	);
}
