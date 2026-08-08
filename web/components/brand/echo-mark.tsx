import { cn } from "@/lib/utils";

export type EchoState =
	| "idle"
	| "listening"
	| "thinking"
	| "tool"
	| "working"
	| "waiting-approval"
	| "remembering"
	| "heartbeat"
	| "success"
	| "reconnecting"
	| "offline"
	| "failure";

const STATE_LABELS: Record<EchoState, string> = {
	idle: "Saaya",
	listening: "Saaya is listening",
	thinking: "Saaya is thinking",
	tool: "Saaya is using a tool",
	working: "Saaya is working on a job",
	"waiting-approval": "Saaya is waiting on your approval",
	remembering: "Saaya is remembering",
	heartbeat: "Saaya heartbeat",
	success: "Saaya finished",
	reconnecting: "Saaya is reconnecting",
	offline: "Saaya is offline",
	failure: "Saaya hit a failure",
};

/* The living mark: the body is the work, the echo is Saaya. State moves
   only the echo (and, when listening, the body); geometry stays identical
   to the static brand assets so every size still reads as the same mark. */
export function EchoMark({
	state = "idle",
	className,
	title,
}: {
	state?: EchoState;
	className?: string;
	title?: string;
}) {
	const label = title ?? STATE_LABELS[state];
	return (
		<svg
			viewBox="0 0 64 64"
			role="img"
			aria-label={label}
			className={cn("size-6", `echo-state-${state}`, className)}
		>
			<title>{label}</title>
			<circle
				cx="37"
				cy="37"
				r="17"
				className="echo-part fill-primary opacity-90"
			/>
			<circle cx="27" cy="27" r="17" className="echo-body fill-current" />
		</svg>
	);
}
