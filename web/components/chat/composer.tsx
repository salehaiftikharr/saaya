"use client";

import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({
	disabled,
	onSend,
}: {
	disabled: boolean;
	onSend: (text: string) => void;
}) {
	const [draft, setDraft] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const submit = () => {
		const text = draft.trim();
		if (text === "" || disabled) return;
		setDraft("");
		onSend(text);
		textareaRef.current?.focus();
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
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						submit();
					}
				}}
				placeholder="Message Saaya"
				aria-label="Message Saaya"
				rows={1}
				className="max-h-40 min-h-10 flex-1 resize-none"
			/>
			<Button
				type="submit"
				size="icon"
				aria-label="Send"
				disabled={disabled || draft.trim() === ""}
			>
				<ArrowUp className="size-4" />
			</Button>
		</form>
	);
}
