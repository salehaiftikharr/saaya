"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/health-api";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;
const UP_VALUES = new Set(["ok", "connected", "enabled"]);

type Snapshot = Record<string, string> | "offline";

function dotClass(value: string | undefined): string {
	if (value === undefined) return "bg-destructive";
	if (value.includes("waiting")) return "bg-amber-500";
	if (UP_VALUES.has(value) || value === "idle" || value.endsWith("live")) {
		return "bg-primary";
	}
	return "bg-border";
}

/* Quiet truth about the doors: one dot per surface, red only when the
   server itself cannot be reached. A static snapshot disables polling so
   stories stay hermetic. */
export function SurfaceStatus({ snapshot }: { snapshot?: Snapshot }) {
	const [surfaces, setSurfaces] = useState<Record<string, string> | null>(
		typeof snapshot === "object" ? snapshot : null,
	);
	const [offline, setOffline] = useState(snapshot === "offline");

	useEffect(() => {
		if (snapshot !== undefined) return;
		let cancelled = false;
		const poll = () => {
			fetchHealth()
				.then((health) => {
					if (cancelled) return;
					setSurfaces(health.surfaces);
					setOffline(false);
				})
				.catch(() => {
					if (cancelled) return;
					setOffline(true);
				});
		};
		poll();
		const interval = setInterval(poll, POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [snapshot]);

	if (offline) {
		return (
			<span className="flex items-center gap-1.5 text-destructive text-xs">
				<span aria-hidden className="size-1.5 rounded-full bg-destructive" />
				Reconnecting
			</span>
		);
	}
	if (!surfaces) {
		return (
			<span
				role="status"
				className="text-muted-foreground text-xs"
				aria-label="Checking status"
			>
				&hellip;
			</span>
		);
	}
	return (
		<span
			role="status"
			className="flex items-center gap-2"
			aria-label="Surface status"
		>
			{Object.entries(surfaces).map(([name, value]) => (
				<span
					key={name}
					title={`${name}: ${value}`}
					className="flex items-center gap-1 text-muted-foreground text-xs"
				>
					<span
						aria-hidden
						className={cn("size-1.5 rounded-full", dotClass(value))}
					/>
					{name}
					<span className="sr-only">{value}</span>
				</span>
			))}
		</span>
	);
}
