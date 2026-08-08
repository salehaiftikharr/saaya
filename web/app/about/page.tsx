"use client";

import Link from "next/link";
import { Beat } from "@/components/about/beat";
import { DeviceFrame } from "@/components/about/device-frame";
import { MemoryDiff } from "@/components/about/memory-diff";
import { SiteHeader } from "@/components/about/site-header";
import { EchoMark, type EchoState } from "@/components/brand/echo-mark";
import { ContinuityStrip } from "@/components/chat/continuity-strip";
import { EchoTrail } from "@/components/chat/echo-trail";
import { Message } from "@/components/chat/message";
import { HeartbeatRow } from "@/components/memory/heartbeat-row";
import { SemanticItemRow } from "@/components/memory/semantic-item";
import { VersionRow } from "@/components/memory/version-row";
import { ToolRow } from "@/components/tools/tool-row";
import { Button } from "@/components/ui/button";
import {
	demoArchitecture,
	demoChannelContinuity,
	demoContinuity,
	demoConversation,
	demoDiff,
	demoHeartbeats,
	demoQuietSummary,
	demoSemanticItems,
	demoTool,
	demoToolLifecycle,
	demoToolTurn,
	demoTrustMatrix,
	demoVersions,
} from "@/lib/demo-fixtures";

// Every demonstration on this page comes from lib/demo-fixtures.ts: one
// reviewed, intentionally fictional dataset. This page never reads live data.
const noop = () => {};

export default function About() {
	return (
		<>
			<SiteHeader />
			<div
				id="top"
				className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-24 sm:px-8"
			>
				<section className="flex flex-col items-center gap-6 pt-20 pb-10 text-center">
					<EchoMark className="size-16 text-foreground drop-shadow-[6px_6px_0_var(--accent)]" />
					<h1 className="type-display max-w-xl text-6xl">
						The coworker that stays.
					</h1>
					<p className="max-w-lg text-muted-foreground text-sm leading-relaxed">
						Saaya (saa-yaa, Urdu for shadow) is a persistent AI coworker powered
						by LangChain. It keeps its own workspace, remembers with provenance,
						and every change to what it knows is reversible.
					</p>
					<div className="flex items-center gap-3">
						<Button
							nativeButton={false}
							render={<Link href="/">Open Saaya</Link>}
						/>
						<Button
							variant="outline"
							nativeButton={false}
							render={<a href="#work">See it work</a>}
						/>
					</div>
					<p className="flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
						<span>Persistent conversations</span>
						<span aria-hidden>-</span>
						<span>Provenance-backed memory</span>
						<span aria-hidden>-</span>
						<span>Web, Slack, and MCP</span>
						<span aria-hidden>-</span>
						<span>Reversible learning</span>
						<span aria-hidden>-</span>
						<span>Approval-gated tools</span>
					</p>
				</section>

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
					id="work"
					title="Watch a real task, including the bad part"
					copy="Tool activity is visible while it happens, and failure is reported honestly with a recovery, never hidden behind a green check."
				>
					<ol className="relative flex flex-col gap-5 border-primary/30 border-l-2 pl-6">
						{demoToolLifecycle.map((step, index) => {
							const markState: EchoState =
								step.state === "running"
									? "tool"
									: step.state === "failed"
										? "failure"
										: step.state === "recovered"
											? "success"
											: "listening";
							return (
								<li key={step.state} className="flex flex-col gap-1.5">
									<div className="flex items-center gap-2.5">
										<EchoMark
											state={markState}
											className="-ml-[38px] size-5 bg-background text-foreground"
										/>
										<span className="type-eyebrow">
											{index + 1} - {step.label}
										</span>
									</div>
									<p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
										{step.copy}
									</p>
									{step.state === "running" && <EchoTrail />}
									{step.state === "recovered" && (
										<div className="max-w-xl">
											<Message message={demoToolTurn} />
										</div>
									)}
								</li>
							);
						})}
					</ol>
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
					id="memory"
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
					id="control"
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
									<dt className="text-muted-foreground text-xs">
										{stat.label}
									</dt>
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
					id="channels"
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
					id="tools"
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

				<Beat
					eyebrow="09 - Trust"
					id="trust"
					title="Boundaries you can read"
					copy="What Saaya can touch is a short list, and every row of it is a real control in the product, not a policy paragraph."
					variant="band"
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
							<thead>
								<tr>
									{[
										"Surface",
										"Saaya reads",
										"Saaya writes",
										"Your control",
									].map((heading) => (
										<th
											key={heading}
											scope="col"
											className="type-eyebrow border-border border-b pr-4 pb-2 font-medium"
										>
											{heading}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{demoTrustMatrix.map((row) => (
									<tr key={row.surface}>
										<th
											scope="row"
											className="border-border/60 border-b py-2.5 pr-4 text-left align-top font-medium"
										>
											{row.surface}
										</th>
										<td className="border-border/60 border-b py-2.5 pr-4 align-top text-muted-foreground">
											{row.reads}
										</td>
										<td className="border-border/60 border-b py-2.5 pr-4 align-top text-muted-foreground">
											{row.writes}
										</td>
										<td className="border-border/60 border-b py-2.5 align-top">
											{row.gate}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Beat>

				<Beat
					eyebrow="10 - How"
					id="architecture"
					title="Why it holds together"
					copy="Saaya is built on LangChain's Deep Agents harness and LangGraph's durable state. Each piece exists for an outcome you can feel."
					variant="split"
				>
					<ul className="flex flex-col gap-3">
						{demoArchitecture.map((item) => (
							<li
								key={item.outcome}
								className="rounded-lg border bg-card p-3.5"
							>
								<p className="text-sm leading-relaxed">{item.outcome}</p>
								<details className="mt-1">
									<summary className="cursor-pointer text-muted-foreground text-xs">
										How
									</summary>
									<p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
										{item.detail}
									</p>
								</details>
							</li>
						))}
					</ul>
				</Beat>

				<section
					aria-label="Continue with Saaya"
					className="-mx-4 mt-10 flex flex-col items-center gap-5 rounded-xl bg-accent/40 px-6 py-16 text-center sm:-mx-8"
				>
					<EchoMark state="success" className="size-12 text-foreground" />
					<h2 className="type-display max-w-md text-4xl">
						Your coworker. Your workspace. Your memory.
					</h2>
					<p className="max-w-md text-muted-foreground text-sm leading-relaxed">
						Saaya runs in your own environment and keeps its work and knowledge
						close. What it learns stays yours, and stays reversible.
					</p>
					<div className="flex items-center gap-3">
						<Button
							nativeButton={false}
							render={<Link href="/">Open Saaya</Link>}
						/>
						<Button
							variant="outline"
							nativeButton={false}
							render={<a href="#work">How it works</a>}
						/>
					</div>
				</section>
				<footer className="flex items-center justify-between pt-10 text-muted-foreground text-xs">
					<span>Saaya - a persistent AI coworker powered by LangChain.</span>
					<a href="#top" className="underline-offset-4 hover:underline">
						Back to top
					</a>
				</footer>
			</div>
		</>
	);
}
