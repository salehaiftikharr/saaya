import type { SemanticItem } from "@/lib/memory-api";

export function SemanticItemRow({ item }: { item: SemanticItem }) {
	const reinforced =
		item.reinforcement_count > 0
			? `Used ${item.reinforcement_count} ${item.reinforcement_count === 1 ? "time" : "times"} since.`
			: "Not needed yet.";
	return (
		<li className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
			<p className="text-sm leading-relaxed">{item.text}</p>
			<details>
				<summary className="cursor-pointer text-muted-foreground text-xs">
					Where this came from
				</summary>
				<p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
					Remembered as a {item.kind} on{" "}
					{new Date(item.learned_at).toLocaleDateString()}. {reinforced}{" "}
					Confidence {item.confidence.toFixed(1)}.
				</p>
			</details>
		</li>
	);
}
