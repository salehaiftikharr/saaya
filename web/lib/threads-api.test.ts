import { describe, expect, it } from "vitest";
import { groupForTimestamp, relativeTime } from "@/lib/threads-api";

const NOW = new Date("2026-08-08T12:00:00");

describe("relativeTime", () => {
	it("handles singular and plural boundaries", () => {
		expect(relativeTime("2026-08-08T11:58:30", NOW)).toBe("1m ago");
		expect(relativeTime("2026-08-08T11:59:30", NOW)).toBe("just now");
		expect(relativeTime("2026-08-08T11:30:00", NOW)).toBe("30m ago");
		expect(relativeTime("2026-08-08T11:00:00", NOW)).toBe("1h ago");
		expect(relativeTime("2026-08-07T12:00:00", NOW)).toBe("1d ago");
	});

	it("treats future clock skew as just now", () => {
		expect(relativeTime("2026-08-08T12:03:00", NOW)).toBe("just now");
	});

	it("reports invalid timestamps honestly", () => {
		expect(relativeTime("not-a-date", NOW)).toBe("unknown");
	});
});

describe("groupForTimestamp", () => {
	it("assigns calendar groups", () => {
		expect(groupForTimestamp("2026-08-08T00:05:00", NOW)).toBe("Today");
		expect(groupForTimestamp("2026-08-07T23:55:00", NOW)).toBe("Yesterday");
		expect(groupForTimestamp("2026-08-02T12:00:00", NOW)).toBe(
			"Previous 7 days",
		);
		expect(groupForTimestamp("2026-07-20T12:00:00", NOW)).toBe("Older");
	});

	it("keeps future skew in Today", () => {
		expect(groupForTimestamp("2026-08-09T01:00:00", NOW)).toBe("Today");
	});

	it("puts invalid timestamps in Older", () => {
		expect(groupForTimestamp("garbage", NOW)).toBe("Older");
	});

	it("is stable across a DST-length day", () => {
		const dstNow = new Date("2026-11-02T12:00:00");
		expect(groupForTimestamp("2026-11-01T08:00:00", dstNow)).toBe("Yesterday");
	});
});
