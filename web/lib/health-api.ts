export interface JobsHealth {
	worker: string;
	queued: number;
	live: number;
	waiting: number;
}

export interface HealthInfo {
	status: string;
	version: string;
	surfaces: Record<string, string>;
	jobs?: JobsHealth | null;
}

export async function fetchHealth(): Promise<HealthInfo> {
	const response = await fetch("/api/health");
	if (!response.ok) {
		throw new Error(`The server answered with status ${response.status}.`);
	}
	return (await response.json()) as HealthInfo;
}
