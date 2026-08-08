import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* One beat of the story. Variants keep the page's rhythm varied: centered
   editorial moments, split text-beside-proof, and full-width bands. */
export function Beat({
	eyebrow,
	title,
	copy,
	variant = "center",
	id,
	children,
}: {
	eyebrow: string;
	title: string;
	copy: string;
	variant?: "center" | "split" | "split-reverse" | "band";
	id?: string;
	children?: ReactNode;
}) {
	const header = (
		<div
			className={cn(
				"flex flex-col gap-3",
				variant === "center" || variant === "band"
					? "mx-auto max-w-xl text-center"
					: "max-w-md",
			)}
		>
			<p className="type-eyebrow">{eyebrow}</p>
			<h2 className="type-display text-4xl">{title}</h2>
			<p className="text-muted-foreground text-sm leading-relaxed">{copy}</p>
		</div>
	);

	if (variant === "split" || variant === "split-reverse") {
		return (
			<section
				id={id}
				aria-label={title}
				className={cn(
					"grid items-center gap-8 py-14 md:grid-cols-2",
					variant === "split-reverse" && "md:[&>*:first-child]:order-2",
				)}
			>
				{header}
				<div className="min-w-0">{children}</div>
			</section>
		);
	}
	if (variant === "band") {
		return (
			<section
				id={id}
				aria-label={title}
				className="-mx-4 flex flex-col gap-6 rounded-xl bg-accent/40 px-6 py-12 sm:-mx-8 sm:px-10"
			>
				{header}
				{children && <div className="mx-auto w-full max-w-2xl">{children}</div>}
			</section>
		);
	}
	return (
		<section id={id} aria-label={title} className="flex flex-col gap-6 py-14">
			{header}
			{children && <div className="mx-auto w-full max-w-2xl">{children}</div>}
		</section>
	);
}
