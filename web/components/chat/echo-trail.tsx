export function EchoTrail() {
	return (
		<div
			role="status"
			aria-label="Saaya is working"
			className="flex items-center gap-1.5 py-1"
		>
			<span className="size-2.5 animate-echo rounded-full bg-foreground/80" />
			<span className="size-2 animate-echo rounded-full bg-primary/70 [animation-delay:150ms]" />
			<span className="size-1.5 animate-echo rounded-full bg-primary/40 [animation-delay:300ms]" />
		</div>
	);
}
