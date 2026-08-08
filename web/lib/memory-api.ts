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
