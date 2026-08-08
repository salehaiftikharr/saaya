import type { ReactNode } from "react";

export function Beat({
	eyebrow,
	title,
	copy,
	children,
}: {
	eyebrow: string;
	title: string;
	copy: string;
	children?: ReactNode;
}) {
	return (
		<section aria-label={title} className="flex flex-col gap-6 py-14">
			<div className="mx-auto flex w-full max-w-xl flex-col gap-3 text-center">
				<p className="type-eyebrow">{eyebrow}</p>
				<h2 className="type-display text-4xl">{title}</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">{copy}</p>
			</div>
			{children && <div className="mx-auto w-full max-w-2xl">{children}</div>}
		</section>
	);
}
