"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionState {
	loading: boolean;
	required: boolean;
	authenticated: boolean;
	unreachable: boolean;
}

// The gate's single source of truth. Checked once before the app mounts,
// so no poller or data fetch runs against a locked API.
export function useSession(): SessionState & { refresh: () => void } {
	const [state, setState] = useState<SessionState>({
		loading: true,
		required: false,
		authenticated: false,
		unreachable: false,
	});

	const refresh = useCallback(() => {
		fetch("/api/auth/session")
			.then(async (response) => {
				if (!response.ok) throw new Error(`status ${response.status}`);
				const body = (await response.json()) as {
					required: boolean;
					authenticated: boolean;
				};
				setState({ loading: false, unreachable: false, ...body });
			})
			.catch(() => {
				setState((current) => ({
					...current,
					loading: false,
					unreachable: true,
				}));
			});
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { ...state, refresh };
}

export async function login(passphrase: string): Promise<string | null> {
	const response = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ passphrase }),
	});
	if (response.ok) return null;
	if (response.status === 401) return "That passphrase is not right.";
	if (response.status === 429) {
		return "Too many attempts; wait fifteen minutes and try again.";
	}
	return "Saaya could not check the passphrase; try again in a moment.";
}
