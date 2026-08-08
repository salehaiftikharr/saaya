"use client";

import Link from "next/link";
import { Beat } from "@/components/about/beat";
import { DeviceFrame } from "@/components/about/device-frame";
import { MemoryDiff } from "@/components/about/memory-diff";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { ContinuityStrip } from "@/components/chat/continuity-strip";
import { EchoTrail } from "@/components/chat/echo-trail";
import { Message } from "@/components/chat/message";
import { HeartbeatRow } from "@/components/memory/heartbeat-row";
import { SemanticItemRow } from "@/components/memory/semantic-item";
import { VersionRow } from "@/components/memory/version-row";
import { ToolRow } from "@/components/tools/tool-row";
import {
	demoChannelContinuity,
	demoContinuity,
	demoConversation,
	demoDiff,
	demoHeartbeats,
	demoQuietSummary,
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
		<div className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-24 sm:px-8">
			<header className="flex flex-col items-center gap-5 pt-24 pb-6 text-center">
				<SaayaMark className="size-16 text-foreground drop-shadow-[6px_6px_0_var(--accent)]" />
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
				copy="Plain talk, streamed replies, nothing to configure. Saaya notices what is durable and keeps it."
				variant="split"
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
				copy="Tool activity is visible while it happens, never narrated after the fact. The trail means Saaya is still working."
				variant="split-reverse"
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
				copy="Close the tab, restart the server, return next week. The thread is where you left it, and what mattered arrives with you."
				variant="band"
			>
				<ContinuityStrip items={[...demoContinuity]} />
			</Beat>

			<Beat
				eyebrow="04 - Learn"
				title="See what it learned, and why"
				copy="Every remembered thing carries its provenance: where it came from, when, and how often it mattered since. Expand any row."
				variant="split"
			>
				<ul className="flex flex-col gap-2 border-primary/30 border-l-2 pl-4">
					{demoSemanticItems.map((item) => (
						<SemanticItemRow key={item.id} item={item} />
					))}
				</ul>
			</Beat>

			<Beat
				eyebrow="05 - Reverse"
				title="Review or reverse any change"
				copy="Working knowledge is versioned like code. Read the change as a diff; restore any point, and the restore itself is recorded."
				variant="split-reverse"
			>
				<div className="flex flex-col gap-3">
					<MemoryDiff
						file={demoDiff.file}
						removed={demoDiff.removed}
						added={demoDiff.added}
					/>
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
				</div>
			</Beat>

			<Beat
				eyebrow="06 - Quiet"
				title="A heartbeat that respects quiet"
				copy="On a schedule, Saaya looks at settled conversations. When nothing durable happened, it says nothing at all."
				variant="band"
			>
				<div className="flex flex-col gap-6">
					<dl className="grid grid-cols-3 gap-3">
						{demoQuietSummary.map((stat) => (
							<div
								key={stat.label}
								className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-center"
							>
								<dd className="type-recap-numeral">{stat.value}</dd>
								<dt className="text-muted-foreground text-xs">{stat.label}</dt>
							</div>
						))}
					</dl>
					<ul className="flex flex-col gap-2">
						{demoHeartbeats.map((run) => (
							<HeartbeatRow key={run.started_at} run={run} />
						))}
					</ul>
				</div>
			</Beat>

			<Beat
				eyebrow="07 - Everywhere"
				title="One coworker, three doors"
				copy="Web, Slack, and MCP reach the same memory and the same threads. A conversation started in one door continues through the next."
			>
				<ol className="grid gap-3 md:grid-cols-3">
					{demoChannelContinuity.map((step, index) => (
						<li
							key={step.surface}
							className="relative flex flex-col gap-2 rounded-lg border bg-card p-4"
						>
							<p className="type-eyebrow">
								{index + 1} - {step.surface}
							</p>
							<p className="text-sm leading-relaxed">{step.line}</p>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{step.reply}
							</p>
						</li>
					))}
				</ol>
			</Beat>

			<Beat
				eyebrow="08 - Extend"
				title="Extend it safely"
				copy="Saaya proposes reusable capabilities as small scripts. Nothing runs until you read the code and approve it; every change stays reversible."
				variant="split"
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
