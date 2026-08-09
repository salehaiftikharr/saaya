// Minimal local stand-ins for the ai-sdk types the ported ai-elements
// components reference. Saaya's transport is its own SSE wire, so only the
// shapes these components actually touch exist here; installing the full
// ai package for three type imports would be a dependency for nothing.

export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export type ToolUIPart = {
	type: `tool-${string}`;
	state:
		| "input-streaming"
		| "input-available"
		| "approval-requested"
		| "approval-responded"
		| "output-available"
		| "output-error"
		| "output-denied"
		| "interrupted";
	input?: unknown;
	output?: unknown;
	errorText?: string;
};

export type FileUIPart = {
	type: "file";
	url: string;
	mediaType: string;
	filename?: string;
};

export type TextUIPart = { type: "text"; text: string };
export type ReasoningUIPart = { type: "reasoning"; text?: string };

export type UIMessagePart =
	| TextUIPart
	| ReasoningUIPart
	| FileUIPart
	| ToolUIPart
	| { type: `data-${string}`; data?: unknown }
	| { type: "step-start" };

export type UIMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	parts: UIMessagePart[];
};
