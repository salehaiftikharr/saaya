"use client";

import Link from "next/link";
import { Beat } from "@/components/about/beat";
import { DeviceFrame } from "@/components/about/device-frame";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { ContinuityStrip } from "@/components/chat/continuity-strip";
import { EchoTrail } from "@/components/chat/echo-trail";
import { Message } from "@/components/chat/message";
import { HeartbeatRow } from "@/components/memory/heartbeat-row";
import { SemanticItemRow } from "@/components/memory/semantic-item";
import { VersionRow } from "@/components/memory/version-row";
import { ToolRow } from "@/components/tools/tool-row";

// Every fixture below is genuine product output from a development instance,
// lightly trimmed. Nothing here is invented.
const noop = () => {};

export default function About() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-24">
			<header className="flex flex-col items-center gap-5 pt-24 pb-10 text-center">
				<SaayaMark className="size-16 text-foreground" />
				<h1 className="type-display max-w-xl text-6xl">
					The coworker that stays.
				</h1>
				<p className="max-w-md text-muted-foreground text-sm leading-relaxed">
					Saaya (saa-yaa, Urdu for shadow) keeps its own workspace, remembers
					how you work, and gets more useful the longer you work together.
				</p>
			</header>

			<Beat
				eyebrow="01 - Start"
				title="Start a conversation"
				copy="Plain talk, streamed replies. Nothing to configure before the first useful answer."
			>
				<DeviceFrame address="saaya.local/chat">
					<div className="flex flex-col gap-4">
						<Message
							message={{
								id: "b2-u",
								role: "user",
								text: "Context for how we work together: I deploy my portfolio by pushing to main, it auto-deploys on Vercel.",
								activities: [],
							}}
						/>
						<Message
							message={{
								id: "b2-a",
								role: "assistant",
								text: "Got it, locked in. **Portfolio** - push to main = live. I will not suggest extra deployment steps; I will help you get the code right before you push.",
								activities: [],
							}}
						/>
					</div>
				</DeviceFrame>
			</Beat>

			<Beat
				eyebrow="02 - Work"
				title="Give it work and watch"
				copy="Tool activity is visible while it happens, never narrated after the fact."
			>
				<DeviceFrame address="saaya.local/chat">
					<div className="flex flex-col gap-4">
						<Message
							message={{
								id: "b3-a",
								role: "assistant",
								text: "wodahs",
								activities: [
									{
										id: "b3-t",
										name: "reverse_text",
										state: "done",
										outputPreview: "wodahs",
									},
								],
							}}
						/>
						<EchoTrail />
					</div>
				</DeviceFrame>
			</Beat>

			<Beat
				eyebrow="03 - Return"
				title="Come back without starting over"
				copy="Close the tab, restart the server, return days later. The thread and its context are still here."
			>
				<DeviceFrame address="saaya.local/chat">
					<ContinuityStrip
						items={[
							{
								kind: "constraint",
								text: "Saleha is a new grad on F-1 OPT; for any job search help, always check visa sponsorship availability first.",
							},
							{
								kind: "fact",
								text: "Saleha deploys her portfolio by pushing to main; it auto-deploys on Vercel.",
							},
							{ kind: "entity", text: "Portfolio site is saleha.live." },
						]}
					/>
				</DeviceFrame>
			</Beat>

			<Beat
				eyebrow="04 - Learn"
				title="See what it learned, and why"
				copy="Every remembered thing carries its provenance: where it came from, when, and how often it mattered since."
			>
				<ul className="flex flex-col gap-2">
					<SemanticItemRow
						item={{
							id: "b5-1",
							kind: "preference",
							text: "Writes git commits in plain sentence case with no emojis.",
							confidence: 0.7,
							reinforcement_count: 4,
							learned_at: "2026-08-08T03:45:00Z",
						}}
					/>
					<SemanticItemRow
						item={{
							id: "b5-2",
							kind: "preference",
							text: "Considers Playwright tests mandatory before marking any work as done.",
							confidence: 0.7,
							reinforcement_count: 1,
							learned_at: "2026-08-08T04:04:00Z",
						}}
					/>
				</ul>
			</Beat>

			<Beat
				eyebrow="05 - Reverse"
				title="Review or reverse any change"
				copy="Saaya's working knowledge is versioned. A restore is itself recorded, so nothing is ever silently lost. The identity file is protected and never writable."
			>
				<ul className="flex flex-col gap-2">
					<VersionRow
						entry={{
							version: 6,
							reason: "heartbeat reflection over thread 898c85db",
							changed_files: ["how-i-work.md"],
							recorded_at: "2026-08-08T08:00:00Z",
						}}
						current
						disabled
						onRollback={noop}
					/>
					<VersionRow
						entry={{
							version: 3,
							reason: "rollback to version 1",
							changed_files: ["how-i-work.md"],
							recorded_at: "2026-08-08T03:54:00Z",
						}}
						current={false}
						disabled
						onRollback={noop}
					/>
				</ul>
			</Beat>

			<Beat
				eyebrow="06 - Quiet"
				title="A heartbeat that respects quiet"
				copy="On a schedule, Saaya looks at settled conversations and decides whether anything durable was learned. When nothing meaningful happened, it says nothing at all."
			>
				<ul className="flex flex-col gap-2">
					<HeartbeatRow
						run={{
							name: "reflect",
							outcome: "completed",
							detail: "898c85db: applied",
							started_at: "2026-08-08T08:00:00Z",
							finished_at: "2026-08-08T08:00:02Z",
						}}
					/>
					<HeartbeatRow
						run={{
							name: "reflect",
							outcome: "completed",
							detail: "abdabe72: skipped",
							started_at: "2026-08-08T04:04:15Z",
							finished_at: "2026-08-08T04:04:16Z",
						}}
					/>
				</ul>
			</Beat>

			<Beat
				eyebrow="07 - Everywhere"
				title="One coworker, three doors"
				copy="Web, Slack, and MCP reach the same memory and the same thread discipline. Ask in Slack, continue on the web, query from your editor."
			>
				<DeviceFrame address="saaya.local/api/health">
					<pre className="overflow-x-auto font-mono text-muted-foreground text-xs leading-relaxed">
						{`{
  "status": "ok",
  "surfaces": { "web": "ok", "slack": "connected", "mcp": "enabled" }
}`}
					</pre>
				</DeviceFrame>
			</Beat>

			<Beat
				eyebrow="08 - Extend"
				title="Extend it safely"
				copy="Saaya can propose reusable capabilities as small scripts. Drafts run nowhere until you read the code and approve it; every change is versioned and reversible."
			>
				<ul className="flex flex-col gap-2">
					<ToolRow
						tool={{
							name: "reverse_text",
							description: "Reverses a string of text.",
							params: { text: "string" },
							script:
								'import json, os\nparams = json.loads(os.environ["TOOL_INPUT"])\nprint(params["text"][::-1])',
							status: "draft",
							version: 1,
						}}
						disabled
						onActivate={noop}
						onDisable={noop}
					/>
				</ul>
			</Beat>

			<footer className="flex flex-col items-center gap-3 pt-14 text-center">
				<SaayaMark className="size-8 text-foreground" />
				<p className="text-muted-foreground text-sm">
					Saaya is open source and runs on your own machine.
				</p>
				<Link
					href="/"
					className="text-primary text-sm underline-offset-4 hover:underline"
				>
					Open Saaya
				</Link>
			</footer>
		</div>
	);
}
