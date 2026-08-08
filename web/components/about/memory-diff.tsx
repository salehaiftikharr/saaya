import { Minus, Plus } from "lucide-react";

/* A memory change as a readable diff: what left, what arrived. */
export function MemoryDiff({
	file,
	removed,
	added,
}: {
	file: string;
	removed: readonly string[];
	added: readonly string[];
}) {
	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			<p className="border-b px-3 py-2 font-mono text-muted-foreground text-xs">
				{file}
			</p>
			<ul className="flex flex-col p-2 font-mono text-xs leading-relaxed">
				{removed.map((line) => (
					<li
						key={line}
						className="flex items-start gap-2 rounded px-2 py-1 text-muted-foreground line-through decoration-border"
					>
						<Minus aria-hidden className="mt-0.5 size-3 shrink-0" />
						<span className="min-w-0">{line}</span>
						<span className="sr-only">removed</span>
					</li>
				))}
				{added.map((line) => (
					<li
						key={line}
						className="flex items-start gap-2 rounded bg-accent/60 px-2 py-1 text-accent-foreground"
					>
						<Plus aria-hidden className="mt-0.5 size-3 shrink-0" />
						<span className="min-w-0">{line}</span>
						<span className="sr-only">added</span>
					</li>
				))}
			</ul>
		</div>
	);
}
