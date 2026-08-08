import { MessageSquarePlus } from "lucide-react";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
	return (
		<div className="flex min-h-dvh w-full">
			<aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
				<div className="flex h-14 items-center gap-2.5 px-4">
					<SaayaMark className="size-5" />
					<span className="font-semibold text-sm tracking-tight">saaya</span>
				</div>
				<Separator />
				<div className="flex flex-col gap-1 p-3">
					<Button variant="outline" className="justify-start gap-2" disabled>
						<MessageSquarePlus className="size-4" />
						New conversation
					</Button>
				</div>
				<p className="mt-auto px-4 pb-4 text-muted-foreground text-xs">
					Conversations appear here and survive restarts.
				</p>
			</aside>
			<main className="flex flex-1 flex-col">
				<header className="flex h-14 items-center justify-between border-b px-4">
					<span className="text-muted-foreground text-sm">Getting ready</span>
					<ThemeToggle />
				</header>
				<section
					className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
					aria-label="Empty conversation"
				>
					<SaayaMark className="size-14 text-foreground" />
					<div className="max-w-sm text-center">
						<h1 className="font-semibold text-lg tracking-tight">
							Saaya is being built
						</h1>
						<p className="mt-1 text-muted-foreground text-sm">
							A coworker that remembers how you work. Conversations, memory, and
							visible work land here next.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}
