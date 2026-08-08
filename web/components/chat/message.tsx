import { CircleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
}: {
	message: ChatMessage;
	streaming?: boolean;
}) {
	if (message.role === "user") {
		return (
			<div className="flex justify-end">
				<p className="max-w-[80%] whitespace-pre-wrap rounded-xl bg-secondary px-3.5 py-2 text-secondary-foreground text-sm">
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
				<div
					role="status"
					className="flex flex-col gap-2"
					aria-label="Saaya is working"
				>
					<Skeleton className="h-4 w-3/5" />
					<Skeleton className="h-4 w-2/5" />
				</div>
			) : (
				message.text !== "" && (
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{message.text}
					</p>
				)
			)}
			{message.error && (
				<p className="flex items-center gap-1.5 text-destructive text-sm">
					<CircleAlert aria-hidden className="size-4 shrink-0" />
					{message.error}
				</p>
			)}
		</div>
	);
}
