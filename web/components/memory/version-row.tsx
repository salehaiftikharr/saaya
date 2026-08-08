"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VersionInfo } from "@/lib/memory-api";

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
			<span className="w-10 shrink-0 font-mono text-muted-foreground text-xs">
				v{entry.version}
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm">{entry.reason}</p>
				<p className="text-muted-foreground text-xs">
					{entry.changed_files.join(", ")}
				</p>
			</div>
			{current ? (
				<span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground text-xs">
					current
				</span>
			) : (
				<Button
					variant="ghost"
					size="sm"
					className="gap-1.5"
					disabled={disabled}
					onClick={() => onRollback(entry.version)}
				>
					<Undo2 className="size-3.5" />
					Restore
				</Button>
			)}
		</li>
	);
}
