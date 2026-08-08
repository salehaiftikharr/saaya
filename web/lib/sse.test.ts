import { describe, expect, it } from "vitest";
import { readWireEvents } from "@/lib/sse";
import type { WireEvent } from "@/lib/wire-events";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

async function collect(chunks: string[]): Promise<WireEvent[]> {
	const events: WireEvent[] = [];
	for await (const event of readWireEvents(streamOf(chunks))) {
		events.push(event);
	}
	return events;
}

describe("readWireEvents", () => {
	it("parses complete frames", async () => {
		const events = await collect([
			'data: {"event": "text.delta", "text": "hi"}\n\n',
			'data: {"event": "turn.done"}\n\n',
		]);
		expect(events).toEqual([
			{ event: "text.delta", text: "hi" },
			{ event: "turn.done" },
		]);
	});

	it("reassembles frames split across network chunks", async () => {
		const events = await collect([
			'data: {"event": "text.del',
			'ta", "text": "abc"}\n',
			'\ndata: {"event": "turn.done"}\n\n',
		]);
		expect(events).toEqual([
			{ event: "text.delta", text: "abc" },
			{ event: "turn.done" },
		]);
	});

	it("handles several frames arriving in one chunk", async () => {
		const events = await collect([
			'data: {"event": "tool.started", "name": "t"}\n\ndata: {"event": "turn.done"}\n\n',
		]);
		expect(events).toHaveLength(2);
	});

	it("ignores non-data lines and blank keepalives", async () => {
		const events = await collect([
			": keepalive\n\n",
			'data: {"event": "turn.done"}\n\n',
		]);
		expect(events).toEqual([{ event: "turn.done" }]);
	});
});
