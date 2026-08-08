import type { ReactNode } from "react";

/* The proof surface: real components shown inside a quiet device frame. */
export function DeviceFrame({
	address,
	children,
}: {
	address: string;
	children: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
				<span aria-hidden className="size-2 rounded-full bg-border" />
				<span aria-hidden className="size-2 rounded-full bg-border" />
				<span aria-hidden className="size-2 rounded-full bg-primary/50" />
				<span className="mx-auto font-mono text-muted-foreground text-xs">
					{address}
				</span>
			</div>
			<div className="p-4">{children}</div>
		</div>
	);
}
