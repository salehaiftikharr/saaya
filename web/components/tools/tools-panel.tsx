"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ToolRow, type ToolView } from "./tool-row";

export function ToolsPanel() {
	const [tools, setTools] = useState<ToolView[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(() => {
		fetch("/api/tools")
			.then(async (response) => {
				if (!response.ok) throw new Error(`status ${response.status}`);
				setTools((await response.json()) as ToolView[]);
			})
			.catch(() => setError("Could not load tools."));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const rollback = useCallback(
		async (name: string, version: number) => {
			setBusy(true);
			setError(null);
			try {
				const response = await fetch(`/api/tools/${name}/rollback`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ version }),
				});
				if (!response.ok) throw new Error(`status ${response.status}`);
				load();
				toast(`${name} rolled back to version ${version}`);
			} catch {
				setError(`Could not roll back ${name}.`);
			} finally {
				setBusy(false);
			}
		},
		[load],
	);

	const act = useCallback(
		async (name: string, action: "activate" | "disable") => {
			setBusy(true);
			setError(null);
			try {
				const response = await fetch(`/api/tools/${name}/${action}`, {
					method: "POST",
				});
				if (!response.ok) throw new Error(`status ${response.status}`);
				load();
				toast(
					action === "activate"
						? `${name} is approved and ready`
						: `${name} is disabled`,
				);
			} catch {
				setError(`Could not ${action} ${name}.`);
			} finally {
				setBusy(false);
			}
		},
		[load],
	);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
			<h2 className="type-eyebrow">Tools</h2>
			<p className="text-muted-foreground text-sm">
				Capabilities Saaya proposed. Read a script, then approve it; approved
				tools survive restarts and can be disabled any time.
			</p>
			{error && (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			)}
			{tools.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No tools yet. Ask Saaya to create one when you need a repeatable
					capability.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{tools.map((tool) => (
						<ToolRow
							key={tool.name}
							tool={tool}
							disabled={busy}
							onActivate={(name) => act(name, "activate")}
							onDisable={(name) => act(name, "disable")}
							onRollback={rollback}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
