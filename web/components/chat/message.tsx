"use client";

import { Check, CircleAlert, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import {
	MessageContent,
	Message as MessageFrame,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { EchoTrail } from "./echo-trail";
import { type ToolActivity, ToolActivityList } from "./tool-activity";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	activities: ToolActivity[];
	error?: string;
}

export function Message({
	message,
	streaming = false,
	onRetry,
}: {
	message: ChatMessage;
	streaming?: boolean;
	onRetry?: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(message.text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard can be denied; the button simply does not confirm.
		}
	};

	if (message.role === "user") {
		return (
			<MessageFrame from="user">
				<MessageContent>
					<p className="whitespace-pre-wrap">{message.text}</p>
				</MessageContent>
			</MessageFrame>
		);
	}

	const waiting = streaming && message.text === "" && !message.error;
	return (
		<MessageFrame from="assistant">
			<ToolActivityList activities={message.activities} live={streaming} />
			<MessageContent>
				{waiting ? (
					<EchoTrail />
				) : (
					message.text !== "" && (
						<div className="leading-relaxed [&_code]:font-mono [&_code]:text-[13px]">
							{/* Streamdown renders incomplete markdown gracefully mid-stream. */}
							<Streamdown>{message.text}</Streamdown>
						</div>
					)
				)}
				{message.error && (
					<div className="flex flex-wrap items-center gap-2">
						<p className="flex items-center gap-1.5 text-destructive text-sm">
							<CircleAlert aria-hidden className="size-4 shrink-0" />
							{message.error}
						</p>
						{onRetry && (
							<Button
								variant="outline"
								size="sm"
								className="h-7 gap-1.5"
								onClick={onRetry}
							>
								<RotateCcw className="size-3" />
								Try again
							</Button>
						)}
					</div>
				)}
			</MessageContent>
			{!streaming && message.text !== "" && (
				<div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
					<Button
						variant="ghost"
						size="sm"
						className="h-6 gap-1.5 px-2 text-muted-foreground text-xs"
						onClick={copy}
					>
						{copied ? (
							<Check className="size-3 text-primary" />
						) : (
							<Copy className="size-3" />
						)}
						{copied ? "Copied" : "Copy"}
					</Button>
				</div>
			)}
		</MessageFrame>
	);
}
