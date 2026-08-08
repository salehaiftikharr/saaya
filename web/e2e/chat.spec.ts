import { expect, test } from "@playwright/test";

// Send, watch the streamed reply, reload, and find the transcript restored.
// Live ring only: talks to the real model through the running dev servers.
test.describe("chat end to end", () => {
	test.skip(
		process.env.SAAYA_LIVE !== "1",
		"live ring: set SAAYA_LIVE=1 with both dev servers running",
	);

	test("a conversation streams and survives reload", async ({ page }) => {
		const marker = `e2e-${Date.now()}`;
		await page.goto("/");
		await page.evaluate(() => localStorage.removeItem("saaya.thread"));
		await page.reload();

		const composer = page.getByRole("textbox", { name: "Message Saaya" });
		await composer.fill(
			`Reply with exactly the word ${marker} and nothing else.`,
		);
		await composer.press("Enter");

		const log = page.getByRole("log", { name: "Conversation" });
		await expect(log).toContainText(marker, { timeout: 90_000 });
		await expect(page.getByText("Ready")).toBeVisible({ timeout: 90_000 });

		await page.reload();
		await expect(page.getByRole("log", { name: "Conversation" })).toContainText(
			marker,
			{ timeout: 15_000 },
		);
	});
});
