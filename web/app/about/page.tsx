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
import {
	demoContinuity,
	demoConversation,
	demoHealth,
	demoHeartbeats,
	demoSemanticItems,
	demoTool,
	demoToolTurn,
	demoVersions,
} from "@/lib/demo-fixtures";

// Every demonstration on this page comes from lib/demo-fixtures.ts: one
// reviewed, intentionally fictional dataset. This page never reads live data.
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
						{demoConversation.map((message) => (
							<Message key={message.id} message={message} />
						))}
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
						<Message message={demoToolTurn} />
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
					<ContinuityStrip items={[...demoContinuity]} />
				</DeviceFrame>
			</Beat>

			<Beat
				eyebrow="04 - Learn"
				title="See what it learned, and why"
				copy="Every remembered thing carries its provenance: where it came from, when, and how often it mattered since."
			>
				<ul className="flex flex-col gap-2">
					{demoSemanticItems.map((item) => (
						<SemanticItemRow key={item.id} item={item} />
					))}
				</ul>
			</Beat>

			<Beat
				eyebrow="05 - Reverse"
				title="Review or reverse any change"
				copy="Saaya's working knowledge is versioned. A restore is itself recorded, so nothing is ever silently lost. The identity file is protected and never writable."
			>
				<ul className="flex flex-col gap-2">
					{demoVersions.map((entry, index) => (
						<VersionRow
							key={entry.version}
							entry={entry}
							current={index === 0}
							disabled
							onRollback={noop}
						/>
					))}
				</ul>
			</Beat>

			<Beat
				eyebrow="06 - Quiet"
				title="A heartbeat that respects quiet"
				copy="On a schedule, Saaya looks at settled conversations and decides whether anything durable was learned. When nothing meaningful happened, it says nothing at all."
			>
				<ul className="flex flex-col gap-2">
					{demoHeartbeats.map((run) => (
						<HeartbeatRow key={run.started_at} run={run} />
					))}
				</ul>
			</Beat>

			<Beat
				eyebrow="07 - Everywhere"
				title="One coworker, three doors"
				copy="Web, Slack, and MCP reach the same memory and the same thread discipline. Ask in Slack, continue on the web, query from your editor."
			>
				<DeviceFrame address="saaya.local/api/health">
					<pre className="overflow-x-auto font-mono text-muted-foreground text-xs leading-relaxed">
						{demoHealth}
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
						tool={demoTool}
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
