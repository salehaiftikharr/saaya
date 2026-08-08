"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	fetchHeartbeats,
	fetchMemoryOverview,
	type HeartbeatRunInfo,
	type MemoryOverview,
	rollbackTo,
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
			.then(setHeartbeats)
			.catch(() => setHeartbeats([]));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleRollback = useCallback(
		async (version: number) => {
			setBusy(true);
			try {
				await rollbackTo(version);
				load();
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

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
			<section
				aria-labelledby="procedural-heading"
				className="flex flex-col gap-3"
			>
				<h2
					id="procedural-heading"
					className="font-semibold text-sm tracking-tight"
				>
					Working knowledge
				</h2>
				{overview.procedural.map((file) => (
					<ProceduralFileCard key={file.name} file={file} />
				))}
			</section>
			<section
				aria-labelledby="versions-heading"
				className="flex flex-col gap-3"
			>
				<h2
					id="versions-heading"
					className="font-semibold text-sm tracking-tight"
				>
					Version history
				</h2>
				<ul className="flex flex-col gap-2">
					{[...overview.versions].reverse().map((entry) => (
						<VersionRow
							key={entry.version}
							entry={entry}
							current={entry.version === currentVersion}
							disabled={busy}
							onRollback={handleRollback}
						/>
					))}
				</ul>
			</section>
			<section
				aria-labelledby="heartbeats-heading"
				className="flex flex-col gap-3"
			>
				<h2
					id="heartbeats-heading"
					className="font-semibold text-sm tracking-tight"
				>
					Heartbeats
				</h2>
				{heartbeats.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No heartbeat has needed to run yet. Quiet is normal.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{heartbeats.map((run) => (
							<HeartbeatRow key={`${run.name}-${run.started_at}`} run={run} />
						))}
					</ul>
				)}
			</section>
			<section
				aria-labelledby="semantic-heading"
				className="flex flex-col gap-3"
			>
				<h2
					id="semantic-heading"
					className="font-semibold text-sm tracking-tight"
				>
					Remembered things
				</h2>
				{overview.semantic.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing remembered yet. Tell Saaya something worth keeping.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{overview.semantic.map((item) => (
							<SemanticItemRow key={item.id} item={item} />
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
