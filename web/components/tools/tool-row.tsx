"use client";

import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ToolView {
	name: string;
	description: string;
	params: Record<string, string>;
	script: string;
	status: string;
	version: number;
}

const STATUS_STYLES: Record<string, string> = {
	active: "bg-accent text-accent-foreground",
	draft: "bg-secondary text-secondary-foreground",
	disabled: "border text-muted-foreground",
};

export function ToolRow({
	tool,
	disabled,
	onActivate,
	onDisable,
}: {
	tool: ToolView;
	disabled: boolean;
	onActivate: (name: string) => void;
	onDisable: (name: string) => void;
}) {
	return (
		<li className="flex flex-col gap-2 rounded-lg border bg-card p-3">
			<div className="flex items-center gap-2">
				<span className="font-mono text-sm">{tool.name}</span>
				<span
					className={cn(
						"rounded px-1.5 py-0.5 text-xs",
						STATUS_STYLES[tool.status] ?? STATUS_STYLES.disabled,
					)}
				>
					{tool.status}
				</span>
				<span className="text-muted-foreground text-xs">v{tool.version}</span>
				<span className="ml-auto">
					{tool.status === "active" ? (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5"
							disabled={disabled}
							onClick={() => onDisable(tool.name)}
						>
							<Square className="size-3.5" />
							Disable
						</Button>
					) : (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5"
							disabled={disabled}
							onClick={() => onActivate(tool.name)}
						>
							<Play className="size-3.5" />
							Approve
						</Button>
					)}
				</span>
			</div>
			<p className="text-muted-foreground text-sm">{tool.description}</p>
			<details>
				<summary className="cursor-pointer text-muted-foreground text-xs">
					Read the script before approving
				</summary>
				<pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-xs leading-relaxed">
					{tool.script}
				</pre>
			</details>
		</li>
	);
}
