import { expect, type Page, test } from "@playwright/test";

// Scroll-model proof: the document never scrolls; the sidebar list and the
// transcript scroll independently. Data is mocked at the network edge so
// this spec exercises layout only and needs no backend or model.

const THREADS = Array.from({ length: 60 }, (_, i) => ({
	id: `layout-${i}`,
	title: `Layout probe conversation number ${i}`,
	source: "web",
	last_activity_at: new Date(Date.now() - i * 3_600_000).toISOString(),
}));

const MESSAGES = Array.from({ length: 80 }, (_, i) => ({
	role: i % 2 === 0 ? "user" : "assistant",
	text: `Layout probe message ${i}: enough words to take a line or two in the transcript at desktop width.`,
}));

const BENCH_JOB = {
	id: "layout-job-1",
	thread_id: "layout-0",
	goal: "Layout probe job with a goal long enough to clamp in the bench header region.",
	state: "running",
	error: null,
	step_budget: 12,
	wall_clock_budget_s: 600,
	workspace: "layout-job-1",
	last_event_seq: 40,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	started_at: new Date().toISOString(),
	finished_at: null,
};

const BENCH_EVENTS = Array.from({ length: 40 }, (_, i) => ({
	seq: i + 1,
	at: new Date(Date.now() - (40 - i) * 60_000).toISOString(),
	actor: "saaya",
	type: i % 2 === 0 ? "step_started" : "step_completed",
	payload: {
		n: Math.floor(i / 2) + 1,
		intent: `Layout probe step ${i} with words enough to wrap once at bench width.`,
		summary: `Layout probe summary ${i} with words enough to wrap once at bench width.`,
	},
}));

async function mockApi(
	page: Page,
	messages: typeof MESSAGES,
	jobs: object[] = [],
) {
	await page.route("**/api/jobs", (route) => route.fulfill({ json: jobs }));
	await page.route("**/api/jobs/*", (route) =>
		route.fulfill({
			json: {
				job: BENCH_JOB,
				events: BENCH_EVENTS,
				approvals: [],
				artifacts: [],
			},
		}),
	);
	await page.route("**/api/jobs/*/events**", (route) =>
		route.fulfill({
			contentType: "text/event-stream",
			body: ": keepalive\n\n",
		}),
	);
	await page.route("**/api/threads/archived", (route) =>
		route.fulfill({ json: [] }),
	);
	await page.route("**/api/threads", (route) =>
		route.fulfill({ json: THREADS }),
	);
	await page.route("**/api/chat/*/messages", (route) =>
		route.fulfill({ json: messages }),
	);
	await page.route("**/api/chat/*/context", (route) =>
		route.fulfill({ json: [] }),
	);
	await page.route("**/api/health", (route) =>
		route.fulfill({
			json: {
				status: "ok",
				version: "test",
				surfaces: { web: "ok", slack: "off", mcp: "off" },
			},
		}),
	);
}

async function openApp(page: Page, messages = MESSAGES, jobs: object[] = []) {
	await mockApi(page, messages, jobs);
	await page.goto("/");
	await page.evaluate(() => localStorage.setItem("saaya.thread", "layout-0"));
	await page.reload();
	await page.getByRole("log", { name: "Conversation" }).waitFor();
}

test.describe("application shell scroll model", () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test("the document never scrolls and regions scroll independently", async ({
		page,
	}) => {
		await openApp(page);

		const doc = await page.evaluate(() => ({
			scrollHeight: document.documentElement.scrollHeight,
			clientHeight: document.documentElement.clientHeight,
		}));
		expect(doc.scrollHeight).toBeLessThanOrEqual(doc.clientHeight + 1);

		const sidebar = page.locator('nav[aria-label="Conversations"]');

		const before = await page.evaluate(() => {
			const nav = document.querySelector('nav[aria-label="Conversations"]');
			const log = document.querySelector('[role="log"]');
			const pane = log?.closest('[data-slot="scroll-area-viewport"]');
			return {
				nav: nav ? nav.scrollTop : -1,
				pane: pane ? pane.scrollTop : -1,
			};
		});

		await sidebar.hover();
		await page.mouse.wheel(0, 600);
		await page.waitForTimeout(200);

		const afterSidebarScroll = await page.evaluate(() => {
			const nav = document.querySelector('nav[aria-label="Conversations"]');
			const log = document.querySelector('[role="log"]');
			const pane = log?.closest('[data-slot="scroll-area-viewport"]');
			return {
				nav: nav ? nav.scrollTop : -1,
				pane: pane ? pane.scrollTop : -1,
				docY: window.scrollY,
			};
		});
		expect(afterSidebarScroll.nav).toBeGreaterThan(before.nav);
		expect(afterSidebarScroll.pane).toBe(before.pane);
		expect(afterSidebarScroll.docY).toBe(0);

		await page.getByRole("log", { name: "Conversation" }).hover();
		await page.mouse.wheel(0, -800);
		await page.waitForTimeout(200);

		const afterTranscriptScroll = await page.evaluate(() => {
			const nav = document.querySelector('nav[aria-label="Conversations"]');
			const log = document.querySelector('[role="log"]');
			const pane = log?.closest('[data-slot="scroll-area-viewport"]');
			return {
				nav: nav ? nav.scrollTop : -1,
				pane: pane ? pane.scrollTop : -1,
				docY: window.scrollY,
			};
		});
		expect(afterTranscriptScroll.nav).toBe(afterSidebarScroll.nav);
		expect(afterTranscriptScroll.pane).not.toBe(afterSidebarScroll.pane);
		expect(afterTranscriptScroll.docY).toBe(0);

		for (const label of ["New conversation", "Memory", "Tools"]) {
			await expect(
				page.getByRole("button", { name: label }).first(),
			).toBeInViewport();
		}
		await expect(
			page.getByRole("textbox", { name: "Message Saaya" }),
		).toBeInViewport();
	});

	test("a short transcript produces no scrollable overflow", async ({
		page,
	}) => {
		await openApp(page, MESSAGES.slice(0, 2));
		const pane = await page.evaluate(() => {
			const log = document.querySelector('[role="log"]');
			const viewport = log?.closest('[data-slot="scroll-area-viewport"]');
			return viewport
				? {
						scrollHeight: viewport.scrollHeight,
						clientHeight: viewport.clientHeight,
					}
				: null;
		});
		expect(pane).not.toBeNull();
		if (pane) {
			expect(pane.scrollHeight).toBeLessThanOrEqual(pane.clientHeight + 1);
		}
	});

	test("the latest message stays visible above the composer", async ({
		page,
	}) => {
		await openApp(page);
		await page.evaluate(() => {
			const log = document.querySelector('[role="log"]');
			const viewport = log?.closest('[data-slot="scroll-area-viewport"]');
			viewport?.scrollTo({ top: viewport.scrollHeight });
		});
		await page.waitForTimeout(200);
		await expect(
			page.getByText("Layout probe message 79", { exact: false }),
		).toBeInViewport();
	});
});

test("jump to latest appears when scrolled away and returns the reader", async ({
	page,
}) => {
	await openApp(page);
	// The stream-follow autoscroll must finish pinning before the reader
	// scrolls away, or it re-pins over this scroll under parallel load.
	await page.waitForTimeout(250);
	await page.evaluate(() => {
		const viewport = document.querySelector(
			'[data-slot="scroll-area-viewport"]',
		);
		viewport?.scrollTo({ top: 0 });
	});
	const jump = page.getByRole("button", { name: "Jump to latest" });
	await expect(jump).toBeVisible();
	await jump.click();
	await expect(jump).toBeHidden();
	const nearBottom = await page.evaluate(() => {
		const viewport = document.querySelector(
			'[data-slot="scroll-area-viewport"]',
		);
		if (!viewport) return false;
		return (
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 140
		);
	});
	expect(nearBottom).toBe(true);
});

test("the workbench is its own scroll region beside the transcript", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await openApp(page, MESSAGES, [BENCH_JOB]);
	const bench = page.getByRole("complementary", { name: "Workbench" });
	await expect(bench).toBeVisible();

	// The document still never scrolls with the panel open.
	const doc = await page.evaluate(() => ({
		scrollHeight: document.documentElement.scrollHeight,
		clientHeight: document.documentElement.clientHeight,
	}));
	expect(doc.scrollHeight).toBeLessThanOrEqual(doc.clientHeight + 1);

	// Let the transcript's follow-the-stream autoscroll settle before
	// sampling, so the comparison isolates the bench scroll.
	await page.waitForTimeout(250);
	const before = await page.evaluate(() => {
		const transcript = document.querySelector(
			'main [data-slot="scroll-area-viewport"]',
		);
		return transcript ? transcript.scrollTop : -1;
	});
	const benchScrolled = await page.evaluate(() => {
		const viewport = document.querySelector(
			'aside[aria-label="Workbench"] [data-slot="scroll-area-viewport"]',
		);
		if (!viewport) return -1;
		viewport.scrollTo({ top: 400 });
		return viewport.scrollTop;
	});
	expect(benchScrolled).toBeGreaterThan(0);
	const after = await page.evaluate(() => {
		const transcript = document.querySelector(
			'main [data-slot="scroll-area-viewport"]',
		);
		return transcript ? transcript.scrollTop : -2;
	});
	expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
});

test("no horizontal overflow at phone width with tool activity present", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openApp(page, MESSAGES, [BENCH_JOB]);
	const widths = await page.evaluate(() => ({
		doc: document.documentElement.scrollWidth,
		viewport: document.documentElement.clientWidth,
		main: document.querySelector("main")?.getBoundingClientRect().width ?? -1,
	}));
	expect(widths.doc).toBeLessThanOrEqual(widths.viewport + 1);
	expect(widths.main).toBeLessThanOrEqual(widths.viewport + 1);
});
