import { CircleAlert, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { EchoTrail } from "./echo-trail";
import { type ToolActivity, ToolActivityChip } from "./tool-activity";

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
	if (message.role === "user") {
		return (
			<div className="flex justify-end">
				<p className="max-w-[80%] whitespace-pre-wrap rounded-xl bg-secondary px-3.5 py-2 text-secondary-foreground text-sm motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:animate-in">
					{message.text}
				</p>
			</div>
		);
	}
	const waiting = streaming && message.text === "" && !message.error;
	return (
		<div className="flex flex-col gap-2">
			{message.activities.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{message.activities.map((activity) => (
						<ToolActivityChip key={activity.id} activity={activity} />
					))}
				</div>
			)}
			{waiting ? (
				<EchoTrail />
			) : (
				message.text !== "" && (
					<div className="text-sm leading-relaxed [&_code]:font-mono [&_code]:text-[13px]">
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
		</div>
	);
}
