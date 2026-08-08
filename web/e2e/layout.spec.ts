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

async function mockApi(page: Page, messages: typeof MESSAGES) {
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

async function openApp(page: Page, messages = MESSAGES) {
	await mockApi(page, messages);
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
