import { SaayaMark } from "@/components/brand/saaya-mark";

export interface ContextItem {
	kind: string;
	text: string;
}

export function ContinuityStrip({ items }: { items: ContextItem[] }) {
	if (items.length === 0) return null;
	return (
		<aside
			aria-label="Carried into this conversation"
			className="flex flex-col gap-2 rounded-lg border bg-card p-3"
		>
			<div className="flex items-center gap-2">
				<SaayaMark className="size-3.5 text-foreground" />
				<span className="type-eyebrow">Carried into this conversation</span>
			</div>
			<ul className="flex flex-col gap-1">
				{items.map((item) => (
					<li
						key={item.text}
						className="text-muted-foreground text-sm leading-relaxed"
					>
						{item.text}
					</li>
				))}
			</ul>
		</aside>
	);
}
