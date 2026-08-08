"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
	fetchHeartbeats,
	fetchMemoryOverview,
	forgetMemory,
	type HeartbeatRunInfo,
	type MemoryOverview,
	rollbackTo,
	supersedeMemory,
} from "@/lib/memory-api";
import { HeartbeatRow } from "./heartbeat-row";
import { ProceduralFileCard } from "./procedural-file";
import { SemanticItemRow } from "./semantic-item";
import { VersionRow } from "./version-row";

export function MemoryPanel() {
	const [overview, setOverview] = useState<MemoryOverview | null>(null);
	const [heartbeats, setHeartbeats] = useState<HeartbeatRunInfo[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const seenLatestRun = useRef<string | null>(null);

	const load = useCallback(() => {
		setError(null);
		fetchMemoryOverview()
			.then(setOverview)
			.catch((cause: unknown) => {
				setError(
					cause instanceof Error ? cause.message : "Could not load memory.",
				);
			});
		fetchHeartbeats()
			.then((runs) => {
				setHeartbeats(runs);
				if (runs[0]) seenLatestRun.current ??= runs[0].started_at;
			})
			.catch(() => setHeartbeats([]));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleForget = useCallback(
		async (id: string) => {
			try {
				await forgetMemory(id);
				load();
				toast("Forgotten", {
					description: "It no longer reaches recall or future context.",
				});
			} catch {
				toast("Forget failed", { description: "Try again in a moment." });
			}
		},
		[load],
	);

	const handleCorrect = useCallback(
		async (id: string, text: string) => {
			try {
				await supersedeMemory(id, text);
				load();
				toast("Corrected", {
					description: "The new wording takes over; the old stays on record.",
				});
			} catch {
				toast("Correction failed", { description: "Try again in a moment." });
			}
		},
		[load],
	);

	const handleRollback = useCallback(
		async (version: number) => {
			setBusy(true);
			try {
				await rollbackTo(version);
				load();
				toast("Memory change reverted", {
					description: "The restore is recorded as a new version.",
				});
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Rollback failed.");
			} finally {
				setBusy(false);
			}
		},
		[load],
	);

	if (error) {
		return (
			<p className="p-6 text-destructive text-sm" role="alert">
				{error}
			</p>
		);
	}
	if (!overview) {
		return (
			<div
				className="flex flex-col gap-3 p-6"
				role="status"
				aria-label="Loading memory"
			>
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	const currentVersion = overview.versions.at(-1)?.version;
	const lastHeartbeat = heartbeats[0];

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
			<section
				aria-label="Memory at a glance"
				className="grid grid-cols-1 gap-3 sm:grid-cols-3"
			>
				<div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
					<span className="type-eyebrow">Remembered</span>
					<span className="type-recap-numeral">{overview.semantic.length}</span>
					<span className="text-muted-foreground text-xs">
						things about how you work
					</span>
				</div>
				<div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
					<span className="type-eyebrow">Versions</span>
					<span className="type-recap-numeral">{currentVersion ?? 0}</span>
					<span className="text-muted-foreground text-xs">
						every change reversible
					</span>
				</div>
				<div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
					<span className="type-eyebrow">Last heartbeat</span>
					<span className="type-recap-numeral">
						{lastHeartbeat
							? new Date(lastHeartbeat.started_at).toLocaleTimeString([], {
									hour: "numeric",
									minute: "2-digit",
								})
							: "quiet"}
					</span>
					<span className="text-muted-foreground text-xs">
						{lastHeartbeat
							? `${heartbeats.length} runs recorded`
							: "nothing has needed attention"}
					</span>
				</div>
			</section>
			<section
				aria-labelledby="procedural-heading"
				className="flex flex-col gap-3"
			>
				<h2 id="procedural-heading" className="type-eyebrow">
					Working knowledge
				</h2>
				<p className="text-muted-foreground text-xs">
					How Saaya works with you, kept as readable files it loads into every
					conversation.
				</p>
				{overview.procedural.map((file) => (
					<ProceduralFileCard key={file.name} file={file} />
				))}
			</section>
			<section
				aria-labelledby="versions-heading"
				className="flex flex-col gap-3"
			>
				<h2 id="versions-heading" className="type-eyebrow">
					Version history
				</h2>
				<ul className="flex flex-col gap-2">
					{[...overview.versions].reverse().map((entry) => (
						<VersionRow
							key={entry.version}
							entry={entry}
							current={entry.version === currentVersion}
							disabled={busy}
							currentContent={
								overview.procedural.find((file) =>
									file.name.includes("how-i-work"),
								)?.content
							}
							onRollback={handleRollback}
						/>
					))}
				</ul>
			</section>
			<section
				aria-labelledby="heartbeats-heading"
				className="flex flex-col gap-3"
			>
				<h2 id="heartbeats-heading" className="type-eyebrow">
					Heartbeats
				</h2>
				{heartbeats.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No heartbeat has needed to run yet. Quiet is normal.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{heartbeats.map((run) => (
							<HeartbeatRow
								key={`${run.name}-${run.started_at}`}
								run={run}
								justArrived={
									seenLatestRun.current !== null &&
									run.started_at > seenLatestRun.current
								}
							/>
						))}
					</ul>
				)}
			</section>
			<section
				aria-labelledby="semantic-heading"
				className="flex flex-col gap-3"
			>
				<h2 id="semantic-heading" className="type-eyebrow">
					Remembered things
				</h2>
				<p className="text-muted-foreground text-xs">
					Individual facts Saaya recalls when relevant. Correct or forget any of
					them; nothing is silently erased.
				</p>
				{overview.semantic.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing remembered yet. Tell Saaya something worth keeping.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{overview.semantic.map((item) => (
							<SemanticItemRow
								key={item.id}
								item={item}
								onForget={handleForget}
								onCorrect={handleCorrect}
							/>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
