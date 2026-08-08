import type { SemanticItem } from "@/lib/memory-api";

export function SemanticItemRow({ item }: { item: SemanticItem }) {
	return (
		<li className="flex flex-col gap-1 rounded-lg border bg-card p-3">
			<p className="text-sm leading-relaxed">{item.text}</p>
			<p className="text-muted-foreground text-xs">
				<span className="mr-2 rounded bg-accent px-1.5 py-0.5 font-mono text-accent-foreground">
					{item.kind}
				</span>
				confidence {item.confidence.toFixed(1)}, reinforced{" "}
				{item.reinforcement_count}x
			</p>
		</li>
	);
}
