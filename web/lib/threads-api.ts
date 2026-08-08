export interface ThreadInfo {
	id: string;
	title: string;
	source: "web" | "slack-dm" | "slack-thread" | "mcp";
	last_activity_at: string;
}

export async function fetchThreads(): Promise<ThreadInfo[]> {
	const response = await fetch("/api/threads");
	if (!response.ok) {
		throw new Error(`The server answered with status ${response.status}.`);
	}
	return (await response.json()) as ThreadInfo[];
}

export async function renameThread(id: string, title: string): Promise<void> {
	const response = await fetch(`/api/threads/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title }),
	});
	if (!response.ok) {
		throw new Error(`Rename failed with status ${response.status}.`);
	}
}

export async function archiveThread(id: string): Promise<void> {
	const response = await fetch(`/api/threads/${id}/archive`, {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Archive failed with status ${response.status}.`);
	}
}

export function relativeTime(iso: string, now: Date = new Date()): string {
	const then = new Date(iso);
	if (Number.isNaN(then.getTime())) return "unknown";
	const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
	if (seconds < 90) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return minutes === 1 ? "1m ago" : `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? "1h ago" : `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return days === 1 ? "1d ago" : `${days}d ago`;
}

export type ThreadGroup = "Today" | "Yesterday" | "Previous 7 days" | "Older";

export function groupForTimestamp(
	iso: string,
	now: Date = new Date(),
): ThreadGroup {
	const then = new Date(iso);
	if (Number.isNaN(then.getTime())) return "Older";
	// Calendar-day comparison in the viewer's local timezone; DST-safe
	// because it never does hour arithmetic across day boundaries.
	const startOfDay = (d: Date) =>
		new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
	if (dayDiff <= 0) return "Today";
	if (dayDiff === 1) return "Yesterday";
	if (dayDiff <= 7) return "Previous 7 days";
	return "Older";
}

export const GROUP_ORDER: ThreadGroup[] = [
	"Today",
	"Yesterday",
	"Previous 7 days",
	"Older",
];

export async function restoreThread(id: string): Promise<void> {
	const response = await fetch(`/api/threads/${id}/restore`, {
		method: "POST",
	});
	if (!response.ok) throw new Error("This conversation could not be restored.");
}

export async function fetchArchivedThreads(): Promise<ThreadInfo[]> {
	const response = await fetch("/api/threads/archived");
	if (!response.ok) throw new Error("Archived conversations are unreachable.");
	return response.json();
}
