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

export const demoDiff = {
	file: "how-i-work.md",
	removed: ["- Release notes are drafted after the tag is pushed."],
	added: [
		"- Release notes go out before the version tag is pushed.",
		"- Maya Chen reviews release notes before they ship.",
	],
} as const;

export const demoQuietSummary = [
	{ label: "Heartbeats this week", value: "21" },
	{ label: "Changes applied", value: "2" },
	{ label: "Needed your attention", value: "0" },
] as const;

export const demoChannelContinuity = [
	{
		surface: "Web",
		line: "Noor: Draft the Atlas 2.1 release notes from this changelog.",
		reply:
			"Saaya: Drafted. Highlights, Fixes, Upgrade notes; queued for Maya's review.",
	},
	{
		surface: "Slack",
		line: "Noor: Did Maya sign off on the notes?",
		reply: "Saaya: Yes, an hour ago. The tag is now safe to push.",
	},
	{
		surface: "MCP",
		line: 'ask_saaya("What is left before the 2.1 tag?")',
		reply: '"Nothing. Notes shipped after Maya\'s review; push the tag."',
	},
] as const;

export const demoThreads = [
	{
		id: "demo-t1",
		title: "Draft the Atlas 2.1 release notes",
		source: "web",
		last_activity_at: new Date(Date.now() - 8 * 60_000).toISOString(),
	},
	{
		id: "demo-t2",
		title: "Standup summary for Maya",
		source: "slack-dm",
		last_activity_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
	},
	{
		id: "demo-t3",
		title: "What is left before the tag",
		source: "mcp",
		last_activity_at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
	},
	{
		id: "demo-t4",
		title: "Changelog format questions and a very long title that keeps going",
		source: "slack-thread",
		last_activity_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
	},
] as const;

export const demoToolLifecycle = [
	{
		state: "requested",
		label: "Requested",
		copy: "Noor asks Saaya to check the Atlas 2.1 release-note draft before the tag.",
	},
	{
		state: "running",
		label: "Running",
		copy: "release_note_check runs in a scrubbed sandbox; the trail shows work in progress.",
	},
	{
		state: "failed",
		label: "Failed, honestly",
		copy: 'The draft is missing its "Upgrade notes" section. Saaya reports the failure and what it means instead of hiding it.',
	},
	{
		state: "recovered",
		label: "Recovered",
		copy: "Saaya drafts the missing section from the changelog, reruns the check, and the draft passes.",
	},
] as const;

export const demoTrustMatrix = [
	{
		surface: "Conversations",
		reads: "Your messages in that thread",
		writes: "Replies and visible tool activity",
		gate: "Nothing crosses threads without memory",
	},
	{
		surface: "Semantic memory",
		reads: "Recalled facts relevant to the moment",
		writes: "New facts with provenance",
		gate: "Correct, forget, or supersede any item",
	},
	{
		surface: "Working knowledge",
		reads: "Loaded into every conversation",
		writes: "Only through validated reflection",
		gate: "Versioned; any change reversible",
	},
	{
		surface: "Identity file",
		reads: "Always",
		writes: "Never",
		gate: "Protected; validation proves it unchanged",
	},
	{
		surface: "Dynamic tools",
		reads: "Approved scripts only",
		writes: "Proposals await your review",
		gate: "Nothing runs before approval",
	},
	{
		surface: "Job workspaces",
		reads: "Files inside that job's own directory",
		writes: "The same directory, size-capped",
		gate: "Command allowlist; writes wait for your approval",
	},
	{
		surface: "Slack and MCP",
		reads: "Messages sent to Saaya",
		writes: "Replies in the same thread",
		gate: "Same memory, separate thread identities",
	},
] as const;

export const demoArchitecture = [
	{
		outcome: "A job that dies mid-run resumes where it stopped.",
		detail:
			"Job execution is a LangGraph graph checkpointed in Postgres. The worker rescans on boot, resumes from the last completed step, and the ledger shows the seam instead of smoothing it over.",
	},
	{
		outcome: "Return next week without re-explaining the work.",
		detail:
			"Conversations are durable LangGraph state in your own Postgres; a restart or a new device changes nothing.",
	},
	{
		outcome: "See exactly where a remembered fact came from.",
		detail:
			"Semantic memory rows carry provenance: source conversation, when, why retained, and how often the memory mattered since.",
	},
	{
		outcome: "Reverse what Saaya learned without erasing history.",
		detail:
			"Working knowledge changes only through reflection that deterministic rules validate; every version is kept and restorable. No model judges another model.",
	},
	{
		outcome: "Use the same coworker from your browser, Slack, or editor.",
		detail:
			"Web, Slack, and MCP run the same Deep Agents harness over the same memory, with thread identities kept separate per surface.",
	},
	{
		outcome: "Nothing Saaya proposes runs until you approve it.",
		detail:
			"Reusable tools are drafts with reviewable code; approval materializes the script, and disable or rollback is one action.",
	},
] as const;

// One fictional Job, told through the same ledger the product persists:
// plan, a real failure, recovery, an approval that held, and an artifact.
export const demoJobGoal =
	"Review the Atlas release checklist, run the checks, and produce a readiness report.";

export const demoJobEvents = [
	{
		seq: 1,
		at: "2026-08-05T14:02:04Z",
		actor: "user",
		type: "job_created",
		payload: {},
	},
	{
		seq: 2,
		at: "2026-08-05T14:02:05Z",
		actor: "system",
		type: "state_changed",
		payload: { from: "queued", to: "planning" },
	},
	{
		seq: 3,
		at: "2026-08-05T14:02:11Z",
		actor: "saaya",
		type: "plan_created",
		payload: {
			count: 3,
			steps: [
				{
					intent: "Read the checklist and map each check to a command",
					creates: [],
				},
				{ intent: "Run the checks and fix anything that fails", creates: [] },
				{
					intent: "Write RELEASE_READINESS.md and register it as an artifact",
					creates: ["RELEASE_READINESS.md"],
				},
			],
		},
	},
	{
		seq: 4,
		at: "2026-08-05T14:02:11Z",
		actor: "saaya",
		type: "state_changed",
		payload: { from: "planning", to: "running" },
	},
	{
		seq: 5,
		at: "2026-08-05T14:02:12Z",
		actor: "saaya",
		type: "step_started",
		payload: {
			n: 1,
			of: 3,
			intent: "Read the checklist and map each check to a command",
		},
	},
	{
		seq: 6,
		at: "2026-08-05T14:02:31Z",
		actor: "saaya",
		type: "step_completed",
		payload: { n: 1, summary: "Three checks found; each maps to one command." },
	},
	{
		seq: 7,
		at: "2026-08-05T14:02:32Z",
		actor: "saaya",
		type: "step_started",
		payload: {
			n: 2,
			of: 3,
			intent: "Run the checks and fix anything that fails",
		},
	},
	{
		seq: 8,
		at: "2026-08-05T14:02:36Z",
		actor: "saaya",
		type: "command_executed",
		payload: { argv: ["python3", "checks/run_checks.py"], exit_code: 1 },
	},
	{
		seq: 9,
		at: "2026-08-05T14:03:02Z",
		actor: "saaya",
		type: "step_completed",
		payload: {
			n: 2,
			summary:
				"The pricing check failed on an off-by-one discount; fixed the line and re-ran clean.",
		},
	},
	{
		seq: 10,
		at: "2026-08-05T14:03:04Z",
		actor: "saaya",
		type: "approval_requested",
		payload: { preview: "Run `git add .` in the job workspace." },
	},
	{
		seq: 11,
		at: "2026-08-05T14:03:04Z",
		actor: "saaya",
		type: "state_changed",
		payload: { from: "running", to: "waiting_approval" },
	},
	{
		seq: 12,
		at: "2026-08-05T14:09:40Z",
		actor: "user",
		type: "approval_decided",
		payload: { decision: "approved" },
	},
	{
		seq: 13,
		at: "2026-08-05T14:09:41Z",
		actor: "saaya",
		type: "state_changed",
		payload: { from: "waiting_approval", to: "running" },
	},
	{
		seq: 14,
		at: "2026-08-05T14:09:44Z",
		actor: "user",
		type: "approval_accepted",
		payload: { preview: "Run `git add .` in the job workspace." },
	},
	{
		seq: 15,
		at: "2026-08-05T14:09:44Z",
		actor: "saaya",
		type: "command_executed",
		payload: { argv: ["git", "add", "."], exit_code: 0 },
	},
	{
		seq: 16,
		at: "2026-08-05T14:10:02Z",
		actor: "saaya",
		type: "artifact_created",
		payload: { path: "RELEASE_READINESS.md", title: "Atlas readiness report" },
	},
	{
		seq: 17,
		at: "2026-08-05T14:10:03Z",
		actor: "saaya",
		type: "job_completed",
		payload: { steps_completed: 3 },
	},
	{
		seq: 18,
		at: "2026-08-05T14:10:03Z",
		actor: "saaya",
		type: "state_changed",
		payload: { from: "running", to: "completed" },
	},
] as const;

export const demoJobApproval = {
	id: "demo-approval",
	job_id: "demo-job",
	kind: "command",
	preview:
		"Run `git add .` in the job workspace. git add writes to the workspace.",
	payload: {},
	requested_at: "2026-08-05T14:03:04Z",
	decided_at: "2026-08-05T14:09:40Z",
	decision: "approved",
	consumed_at: "2026-08-05T14:09:44Z",
} as const;
