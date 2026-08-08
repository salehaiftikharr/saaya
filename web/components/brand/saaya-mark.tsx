import { cn } from "@/lib/utils";

/* The Saaya mark: a body and its echo. The body carries the current text
   color; the echo is always dusk (the primary token). Geometry mirrors
   brand/saaya-mark.svg. */
export function SaayaMark({
	className,
	title = "Saaya",
}: {
	className?: string;
	title?: string;
}) {
	return (
		<svg
			viewBox="0 0 64 64"
			role="img"
			aria-label={title}
			className={cn("size-6", className)}
		>
			<title>{title}</title>
			<circle cx="37" cy="37" r="17" className="fill-primary opacity-90" />
			<circle cx="27" cy="27" r="17" fill="currentColor" />
		</svg>
	);
}
