import type { WireEvent } from "@/lib/wire-events";

// Parses a fetch body carrying server-sent events into wire events.
// Frames are separated by a blank line; data lines carry the payload.
export async function* readWireEvents(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<WireEvent> {
	const decoder = new TextDecoder();
	const reader = body.getReader();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let boundary = buffer.indexOf("\n\n");
			while (boundary !== -1) {
				const frame = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const data = frame
					.split("\n")
					.filter((line) => line.startsWith("data: "))
					.map((line) => line.slice(6))
					.join("\n");
				if (data) {
					yield JSON.parse(data) as WireEvent;
				}
				boundary = buffer.indexOf("\n\n");
			}
		}
	} finally {
		reader.releaseLock();
	}
}
