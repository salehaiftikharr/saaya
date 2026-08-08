export interface ThreadInfo {
	id: string;
	last_activity_at: string;
}

export async function fetchThreads(): Promise<ThreadInfo[]> {
	const response = await fetch("/api/threads");
	if (!response.ok) {
		throw new Error(`The server answered with status ${response.status}.`);
	}
	return (await response.json()) as ThreadInfo[];
}

export function relativeTime(iso: string): string {
	const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 90) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}
