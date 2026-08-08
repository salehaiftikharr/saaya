import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolActivity {
	id: string;
	name: string;
	state: "running" | "done";
	outputPreview?: string;
}

export function ToolActivityChip({ activity }: { activity: ToolActivity }) {
	return (
		<span
			title={activity.outputPreview}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-0.5",
				"font-mono text-muted-foreground text-xs",
			)}
		>
			{activity.state === "running" ? (
				<Loader2
					aria-hidden
					className="size-3 animate-spin motion-reduce:animate-none"
				/>
			) : (
				<Check aria-hidden className="size-3 text-primary" />
			)}
			{activity.name}
			<span className="sr-only">
				{activity.state === "running" ? "running" : "finished"}
			</span>
		</span>
	);
}
