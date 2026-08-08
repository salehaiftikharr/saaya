"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { cn } from "@/lib/utils";

export interface ContextItem {
	kind: string;
	text: string;
}

// One quiet line above the transcript: what Saaya carried in, collapsed by
// default so recalled memory never pushes the present conversation down.
// Expanding shows each memory with its kind; full provenance lives in the
// Memory panel.
export function ContinuityStrip({ items }: { items: ContextItem[] }) {
	const [open, setOpen] = useState(false);
	if (items.length === 0) return null;
	const preview = items[0].text;
	return (
		<aside
			aria-label="Carried into this conversation"
			className="rounded-lg border border-dashed bg-card/50"
		>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
				className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted/40"
			>
				<SaayaMark className="size-3.5 shrink-0 text-foreground" />
				<span className="type-eyebrow shrink-0">
					{items.length} {items.length === 1 ? "memory" : "memories"} carried in
				</span>
				{!open && (
					<span className="min-w-0 truncate text-muted-foreground text-xs">
						{preview}
					</span>
				)}
				<ChevronRight
					aria-hidden
					className={cn(
						"ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-90",
					)}
				/>
			</button>
			{open && (
				<ul className="flex flex-col gap-1.5 border-t px-3 py-2.5">
					{items.map((item) => (
						<li key={item.text} className="flex items-baseline gap-2 text-sm">
							<span className="type-eyebrow shrink-0 text-muted-foreground">
								{item.kind}
							</span>
							<span className="text-muted-foreground leading-relaxed">
								{item.text}
							</span>
						</li>
					))}
				</ul>
			)}
		</aside>
	);
}
