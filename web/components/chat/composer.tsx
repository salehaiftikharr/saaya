"use client";

import { ArrowUp, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function draftKey(threadId: string | null): string {
	return `saaya:draft:${threadId ?? "new"}`;
}

export function Composer({
	disabled,
	working = false,
	threadId = null,
	onSend,
	onStop,
}: {
	disabled: boolean;
	working?: boolean;
	threadId?: string | null;
	onSend: (text: string) => void;
	onStop?: () => void;
}) {
	const [draft, setDraft] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const submitting = useRef(false);
	const wasWorking = useRef(false);

	// Typed text survives switching conversations: each thread keeps its own
	// draft in sessionStorage, restored when the thread returns.
	useEffect(() => {
		setDraft(sessionStorage.getItem(draftKey(threadId)) ?? "");
	}, [threadId]);
	useEffect(() => {
		if (draft) {
			sessionStorage.setItem(draftKey(threadId), draft);
		} else {
			sessionStorage.removeItem(draftKey(threadId));
		}
	}, [draft, threadId]);

	// Focus returns to the composer when a turn ends, so the follow-up can
	// be typed without a click.
	useEffect(() => {
		if (wasWorking.current && !working) {
			textareaRef.current?.focus({ preventScroll: true });
		}
		wasWorking.current = working;
	}, [working]);

	const autogrow = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	}, []);

	const submit = () => {
		const text = draft.trim();
		// The submitting latch swallows the double-fire window between Enter
		// and React's state flush, so one message never sends twice.
		if (text === "" || disabled || submitting.current) return;
		submitting.current = true;
		setDraft("");
		sessionStorage.removeItem(draftKey(threadId));
		onSend(text);
		textareaRef.current?.focus();
		setTimeout(() => {
			submitting.current = false;
		}, 300);
	};

	return (
		<form
			aria-label="Send a message"
			className="flex shrink-0 items-end gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<Textarea
				ref={textareaRef}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
					autogrow();
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						submit();
					}
				}}
				placeholder={working ? "Saaya is working…" : "Message Saaya"}
				aria-label="Message Saaya"
				rows={1}
				className="max-h-40 min-h-10 flex-1 resize-none"
			/>
			<div className="flex flex-col items-end gap-1">
				{working && onStop ? (
					<Button
						type="button"
						size="icon"
						variant="outline"
						aria-label="Stop the reply"
						onClick={onStop}
					>
						<Square className="size-3.5" />
					</Button>
				) : (
					<Button
						type="submit"
						size="icon"
						aria-label="Send"
						disabled={disabled || draft.trim() === ""}
					>
						<ArrowUp className="size-4" />
					</Button>
				)}
				<span className="whitespace-nowrap text-[10px] text-muted-foreground">
					Enter to send
				</span>
			</div>
		</form>
	);
}
