// The single source of demonstration data for every public-facing surface:
// the product story, Storybook, screenshots, and docs examples.
//
// Everything here is intentionally fictional. Noor Rahman and the Atlas
// project at Northstar Labs do not exist; atlas.example uses a reserved
// domain. Marketing and story surfaces import from this module and never
// read live memory, conversation storage, or databases. Adding real user
// data here is a release-blocking defect (see AGENTS.md, Privacy).

import type { ContextItem } from "@/components/chat/continuity-strip";
import type { ChatMessage } from "@/components/chat/message";
import type { HeartbeatRunInfo } from "@/components/memory/heartbeat-row";
import type { ToolView } from "@/components/tools/tool-row";
import type { SemanticItem, VersionInfo } from "@/lib/memory-api";

export const demoPersona = {
	name: "Noor Rahman",
	role: "Product operations lead",
	org: "Northstar Labs",
	project: "Atlas",
	repo: "northstar-labs/atlas",
	domain: "atlas.example",
	team: ["Maya Chen", "Theo Brooks", "Lina Park"],
} as const;

export const demoConversation: ChatMessage[] = [
	{
		id: "demo-u1",
		role: "user",
		text: "Context for how we work: Atlas release notes go out before the version tag is pushed, and Maya reviews them first.",
		activities: [],
	},
	{
		id: "demo-a1",
		role: "assistant",
		text: "Locked in. **Release notes** - drafted before the tag, past Maya first. I will hold any tagging step until the notes have her review.",
		activities: [],
	},
];

export const demoToolTurn: ChatMessage = {
	id: "demo-a2",
	role: "assistant",
	text: "Wednesday, March 4 - two days before the Atlas 2.1 freeze.",
	activities: [
		{
			id: "demo-t1",
			name: "current_datetime",
			state: "done",
			outputPreview: "Wednesday, March 4",
		},
	],
};

export const demoContinuity: ContextItem[] = [
	{
		kind: "constraint",
		text: "Atlas release notes go out before the version tag is pushed.",
	},
	{
		kind: "fact",
		text: "Merging to main deploys atlas.example staging automatically.",
	},
	{
		kind: "entity",
		text: "Maya Chen reviews release notes; Theo Brooks owns the changelog.",
	},
];

export const demoSemanticItems: SemanticItem[] = [
	{
		id: "demo-m1",
		kind: "preference",
		text: "Noor writes commit messages in plain sentence case with no emojis.",
		confidence: 0.7,
		reinforcement_count: 4,
		learned_at: "2026-03-02T14:20:00Z",
	},
	{
		id: "demo-m2",
		kind: "fact",
		text: "The Atlas team demo happens Thursday afternoons.",
		confidence: 0.7,
		reinforcement_count: 1,
		learned_at: "2026-03-03T09:05:00Z",
	},
];

export const demoVersions: VersionInfo[] = [
	{
		version: 6,
		reason: "heartbeat reflection over thread a7c41f02",
		changed_files: ["how-i-work.md"],
		recorded_at: "2026-03-04T08:00:00Z",
	},
	{
		version: 3,
		reason: "rollback to version 1",
		changed_files: ["how-i-work.md"],
		recorded_at: "2026-03-01T16:40:00Z",
	},
];

export const demoHeartbeats: HeartbeatRunInfo[] = [
	{
		name: "reflect",
		outcome: "completed",
		detail: "a7c41f02: applied",
		started_at: "2026-03-04T08:00:00Z",
		finished_at: "2026-03-04T08:00:02Z",
	},
	{
		name: "reflect",
		outcome: "completed",
		detail: "e3b95d11: skipped",
		started_at: "2026-03-04T04:00:00Z",
		finished_at: "2026-03-04T04:00:01Z",
	},
];

export const demoTool: ToolView = {
	name: "release_note_check",
	description:
		"Checks an Atlas release-note draft for the sections the team requires.",
	params: { draft: "string" },
	script:
		'import json, os\nparams = json.loads(os.environ["TOOL_INPUT"])\nrequired = ["Highlights", "Fixes", "Upgrade notes"]\nmissing = [s for s in required if s not in params["draft"]]\nprint("ok" if not missing else f"missing: {missing}")',
	status: "draft",
	version: 1,
};

export const demoHealth = `{
  "status": "ok",
  "surfaces": { "web": "ok", "slack": "connected", "mcp": "enabled" }
}`;
