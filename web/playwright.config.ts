import { defineConfig } from "@playwright/test";

// The live ring: real servers, real model, the owner's own instance.
// Runs only when SAAYA_LIVE=1; CI and default local runs never execute it.
export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: process.env.SAAYA_BASE_URL ?? "http://localhost:3000",
	},
	reporter: [["list"]],
});
