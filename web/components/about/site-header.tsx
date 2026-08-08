"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EchoMark } from "@/components/brand/echo-mark";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ANCHORS = [
	{ href: "#work", label: "Product" },
	{ href: "#memory", label: "Memory" },
	{ href: "#channels", label: "Channels" },
	{ href: "#tools", label: "Tools" },
	{ href: "#control", label: "Control" },
	{ href: "#trust", label: "Trust" },
];

/* The product's front door: quiet at the top, elevated once the story
   starts scrolling. Original composition; nothing floating or pill-shaped. */
export function SiteHeader() {
	const [elevated, setElevated] = useState(false);

	useEffect(() => {
		const onScroll = () => setElevated(window.scrollY > 12);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={cn(
				"sticky top-0 z-40 border-b transition-colors",
				elevated
					? "border-border bg-background/90 backdrop-blur"
					: "border-transparent bg-transparent",
			)}
		>
			<p className="border-b bg-accent/50 py-1.5 text-center text-accent-foreground text-xs">
				Web, Slack, and MCP now share one continuous coworker.
			</p>
			<nav
				aria-label="Product"
				className="mx-auto flex h-14 w-full max-w-4xl items-center gap-6 px-4 sm:px-8"
			>
				<a href="#top" className="flex items-center gap-2.5">
					<EchoMark className="size-5 text-foreground" />
					<span className="font-semibold text-sm tracking-tight">saaya</span>
				</a>
				<div className="hidden items-center gap-5 md:flex">
					{ANCHORS.map((anchor) => (
						<a
							key={anchor.href}
							href={anchor.href}
							className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
						>
							{anchor.label}
						</a>
					))}
				</div>
				<div className="ml-auto flex items-center gap-2">
					<Button
						size="sm"
						className="h-8"
						nativeButton={false}
						render={<Link href="/">Open Saaya</Link>}
					/>
					<Sheet>
						<SheetTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									className="md:hidden"
									aria-label="Menu"
								>
									<Menu className="size-4" />
								</Button>
							}
						/>
						<SheetContent side="right" className="w-64">
							<SheetHeader>
								<SheetTitle className="text-sm">Saaya</SheetTitle>
							</SheetHeader>
							<div className="flex flex-col gap-3 px-4">
								{ANCHORS.map((anchor) => (
									<a
										key={anchor.href}
										href={anchor.href}
										className="text-sm underline-offset-4 hover:underline"
									>
										{anchor.label}
									</a>
								))}
								<Link
									href="/"
									className="font-medium text-primary text-sm underline-offset-4 hover:underline"
								>
									Open Saaya
								</Link>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
