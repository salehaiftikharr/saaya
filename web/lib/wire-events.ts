// Mirror of the server wire event union (server/src/saaya/api/events.py).
// The two definitions change together or not at all.

export type WireEvent =
	| { event: "thread.started"; thread_id: string }
	| { event: "text.delta"; text: string }
	| { event: "tool.started"; name: string }
	| { event: "tool.finished"; name: string; output_preview: string }
	| { event: "turn.done" }
	| { event: "turn.error"; message: string };

export interface TranscriptMessage {
	role: "user" | "assistant";
	text: string;
	activities?: { name: string; output_preview: string }[];
}
