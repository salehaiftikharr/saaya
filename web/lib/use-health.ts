"use client";

import { useEffect, useState } from "react";
import { fetchHealth, type JobsHealth } from "@/lib/health-api";

const HEALTHY_POLL_MS = 30_000;
const OFFLINE_POLL_MS = 5_000;

export interface HealthState {
	surfaces: Record<string, string> | null;
	jobs: JobsHealth | null;
	offline: boolean;
}

// One poll for everyone who cares whether the server is reachable: the
// footer chips and the echo mark read the same truth. The cadence tightens
// while offline so recovery shows within seconds.
export function useHealth(): HealthState {
	const [state, setState] = useState<HealthState>({
		surfaces: null,
		jobs: null,
		offline: false,
	});

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const poll = async () => {
			let offline = false;
			try {
				const health = await fetchHealth();
				if (cancelled) return;
				setState({
					surfaces: health.surfaces,
					jobs: health.jobs ?? null,
					offline: false,
				});
			} catch {
				if (cancelled) return;
				offline = true;
				setState((current) => ({ ...current, offline: true }));
			}
			timer = setTimeout(poll, offline ? OFFLINE_POLL_MS : HEALTHY_POLL_MS);
		};
		poll();
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, []);

	return state;
}
