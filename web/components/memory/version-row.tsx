"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";
import { MemoryDiff } from "@/components/about/memory-diff";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fetchVersionContent, type VersionInfo } from "@/lib/memory-api";

// A set-style line preview: which lines leave, which arrive. Positional
// context lives in the files themselves; the confirm needs the delta.
function previewDiff(current: string, target: string) {
	const currentLines = current.split("\n");
	const targetLines = target.split("\n");
	const currentSet = new Set(currentLines);
	const targetSet = new Set(targetLines);
	return {
		removed: currentLines
			.filter((line) => line.trim() && !targetSet.has(line))
			.slice(0, 10),
		added: targetLines
			.filter((line) => line.trim() && !currentSet.has(line))
			.slice(0, 10),
	};
}

export function versionOutcomeSentence(entry: VersionInfo): string {
	if (entry.reason.startsWith("baseline")) {
		return "Starting point recorded before the first change.";
	}
	if (entry.reason.startsWith("rollback")) {
		return "A memory change was reverted.";
	}
	if (entry.reason.startsWith("heartbeat")) {
		return "Saaya learned from recent conversations on its own.";
	}
	return "Saaya learned from a conversation.";
}

export function VersionRow({
	entry,
	current,
	disabled,
	currentContent,
	onRollback,
}: {
	entry: VersionInfo;
	current: boolean;
	disabled: boolean;
	currentContent?: string;
	onRollback: (version: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const [target, setTarget] = useState<string | null>(null);
	const openWithPreview = () => {
		setOpen(true);
		if (currentContent !== undefined) {
			fetchVersionContent(entry.version)
				.then(setTarget)
				.catch(() => setTarget(null));
		}
	};
	const diff =
		currentContent !== undefined && target !== null
			? previewDiff(currentContent, target)
			: null;
	return (
		<li className="flex items-center gap-3 rounded-lg border bg-card p-3">
			<span className="w-9 shrink-0 font-mono text-muted-foreground text-xs">
				v{entry.version}
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-relaxed">
					{versionOutcomeSentence(entry)}
				</p>
				<details>
					<summary className="cursor-pointer text-muted-foreground text-xs">
						Change record
					</summary>
					<p className="mt-1.5 font-mono text-muted-foreground text-xs">
						{entry.reason} - {entry.changed_files.join(", ")} -{" "}
						{new Date(entry.recorded_at).toLocaleString()}
					</p>
				</details>
			</div>
			{current ? (
				<span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-accent-foreground text-xs">
					current
				</span>
			) : (
				<>
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0 gap-1.5"
						disabled={disabled}
						onClick={openWithPreview}
					>
						<Undo2 className="size-3.5" />
						Restore
					</Button>
					<AlertDialog open={open} onOpenChange={setOpen}>
						<AlertDialogContent className="max-w-lg">
							<AlertDialogHeader>
								<AlertDialogTitle>
									Restore version {entry.version}?
								</AlertDialogTitle>
								<AlertDialogDescription>
									Saaya's working knowledge goes back to this point. Nothing is
									lost: the restore itself is recorded as a new version and can
									be reverted the same way.
								</AlertDialogDescription>
							</AlertDialogHeader>
							{diff && (diff.removed.length > 0 || diff.added.length > 0) ? (
								<div className="max-h-64 overflow-y-auto">
									<MemoryDiff
										file="memory/how-i-work.md"
										removed={diff.removed}
										added={diff.added}
									/>
								</div>
							) : diff ? (
								<p className="text-muted-foreground text-sm">
									The file content is identical to now; only history differs.
								</p>
							) : currentContent !== undefined ? (
								<p className="text-muted-foreground text-sm">
									Loading the change preview…
								</p>
							) : null}
							<AlertDialogFooter>
								<AlertDialogCancel>Keep current</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										setOpen(false);
										onRollback(entry.version);
									}}
								>
									Restore
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			)}
		</li>
	);
}
