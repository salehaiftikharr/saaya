/* Privacy regression gate: no personal identifier from the owner's private
   context may appear anywhere in the tracked tree. Patterns are assembled
   from fragments so this file never matches itself. */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

const BANNED: RegExp[] = [
	new RegExp("sal" + "eha", "i"),
	new RegExp("ift" + "ikhar", "i"),
	new RegExp("\\bF" + "-1\\b"),
	new RegExp("\\bO" + "PT\\b"),
	new RegExp("vi" + "sa sponsor", "i"),
];

const SKIP_SUFFIXES = [".png", ".ico", ".lock", "pnpm-lock.yaml", "uv.lock"];
const SELF = "web/lib/privacy.test.ts";
// The MIT copyright line is the one owner-authorized home for the owner's
// name in the tracked tree (the owner chose the license explicitly). Only
// this exact file is exempt; the gate holds everywhere else.
const AUTHORIZED = ["LICENSE"];

function trackedFiles(): string[] {
	const out = execFileSync("git", ["ls-files"], {
		cwd: REPO_ROOT,
		encoding: "utf-8",
	});
	return out
		.split("\n")
		.filter(Boolean)
		.filter((path) => path !== SELF)
		.filter((path) => !AUTHORIZED.includes(path))
		.filter((path) => !SKIP_SUFFIXES.some((suffix) => path.endsWith(suffix)));
}

describe("privacy gate", () => {
	it("keeps personal identifiers out of the tracked tree", () => {
		const offenders: string[] = [];
		for (const path of trackedFiles()) {
			let content: string;
			try {
				content = readFileSync(join(REPO_ROOT, path), "utf-8");
			} catch {
				continue;
			}
			for (const pattern of BANNED) {
				if (pattern.test(content)) {
					offenders.push(`${path} (${pattern.source})`);
					break;
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});
