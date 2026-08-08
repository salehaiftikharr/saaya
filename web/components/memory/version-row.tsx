"use client";

import { Undo2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VersionInfo } from "@/lib/memory-api";

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
	onRollback,
}: {
	entry: VersionInfo;
	current: boolean;
	disabled: boolean;
	onRollback: (version: number) => void;
}) {
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
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								variant="ghost"
								size="sm"
								className="shrink-0 gap-1.5"
								disabled={disabled}
							>
								<Undo2 className="size-3.5" />
								Restore
							</Button>
						}
					/>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Restore version {entry.version}?
							</AlertDialogTitle>
							<AlertDialogDescription>
								Saaya's working knowledge goes back to this point. Nothing is
								lost: the restore itself is recorded as a new version and can be
								reverted the same way.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Keep current</AlertDialogCancel>
							<AlertDialogAction onClick={() => onRollback(entry.version)}>
								Restore
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</li>
	);
}
