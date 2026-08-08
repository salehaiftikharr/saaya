// Mirror of the memory API models (server/src/saaya/api/memory_routes.py).

export interface ProceduralFile {
	name: string;
	content: string;
	protected: boolean;
}

export interface VersionInfo {
	version: number;
	reason: string;
	changed_files: string[];
	recorded_at: string;
}

export interface SemanticItem {
	id: string;
	kind: string;
	text: string;
	confidence: number;
	reinforcement_count: number;
	learned_at: string;
}

export interface MemoryOverview {
	procedural: ProceduralFile[];
	versions: VersionInfo[];
	semantic: SemanticItem[];
}

export async function fetchMemoryOverview(): Promise<MemoryOverview> {
	const response = await fetch("/api/memory");
	if (!response.ok) {
		throw new Error(`The server answered with status ${response.status}.`);
	}
	return (await response.json()) as MemoryOverview;
}

export async function rollbackTo(version: number): Promise<void> {
	const response = await fetch("/api/memory/rollback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ version }),
	});
	if (!response.ok) {
		throw new Error(`Rollback failed with status ${response.status}.`);
	}
}

export interface HeartbeatRunInfo {
	name: string;
	outcome: string;
	detail: string;
	started_at: string;
	finished_at: string | null;
}

export async function fetchHeartbeats(): Promise<HeartbeatRunInfo[]> {
	const response = await fetch("/api/heartbeats");
	if (!response.ok) {
		throw new Error(`The server answered with status ${response.status}.`);
	}
	return (await response.json()) as HeartbeatRunInfo[];
}

export async function forgetMemory(id: string): Promise<void> {
	const response = await fetch(`/api/memory/items/${id}/forget`, {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Forget failed with status ${response.status}.`);
	}
}

export async function supersedeMemory(id: string, text: string): Promise<void> {
	const response = await fetch(`/api/memory/items/${id}/supersede`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text }),
	});
	if (!response.ok) {
		throw new Error(`Correction failed with status ${response.status}.`);
	}
}

export async function fetchVersionContent(version: number): Promise<string> {
	const response = await fetch(`/api/memory/versions/${version}/content`);
	if (!response.ok) {
		throw new Error(`No snapshot for version ${version}.`);
	}
	return ((await response.json()) as { content: string }).content;
}
