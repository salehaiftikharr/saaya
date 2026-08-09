"use client";

import {
	Brain,
	BriefcaseBusiness,
	Moon,
	PanelLeft,
	Plus,
	Wrench,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { AppView } from "@/components/shell/app-sidebar";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSidebar } from "@/components/ui/sidebar";
import type { ThreadInfo } from "@/lib/threads-api";

export function CommandPalette({
	threads,
	open,
	onOpenChange,
	onSelectThread,
	onSelectView,
	onNewConversation,
}: {
	threads: ThreadInfo[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectThread: (id: string) => void;
	onSelectView: (view: AppView) => void;
	onNewConversation: () => void;
}) {
	const { resolvedTheme, setTheme } = useTheme();
	const { toggleSidebar } = useSidebar();
	const [query, setQuery] = useState("");

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				onOpenChange(!open);
			}
			if (
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				event.key.toLowerCase() === "o"
			) {
				event.preventDefault();
				onNewConversation();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onOpenChange, onNewConversation]);

	const run = (action: () => void) => {
		onOpenChange(false);
		action();
	};

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Command palette"
		>
			<Command>
				<CommandInput
					placeholder="Search conversations, actions…"
					value={query}
					onValueChange={setQuery}
				/>
				<CommandList>
					<CommandEmpty>Nothing matches.</CommandEmpty>
					<CommandGroup heading="Actions">
						<CommandItem onSelect={() => run(onNewConversation)}>
							<Plus />
							New conversation
							<CommandShortcut>
								<KbdGroup>
									<Kbd>⌘</Kbd>
									<Kbd>⇧</Kbd>
									<Kbd>O</Kbd>
								</KbdGroup>
							</CommandShortcut>
						</CommandItem>
						<CommandItem onSelect={() => run(() => onSelectView("memory"))}>
							<Brain />
							Open Memory
						</CommandItem>
						<CommandItem onSelect={() => run(() => onSelectView("work"))}>
							<BriefcaseBusiness />
							Open Work
						</CommandItem>
						<CommandItem onSelect={() => run(() => onSelectView("tools"))}>
							<Wrench />
							Open Tools
						</CommandItem>
						<CommandItem
							onSelect={() =>
								run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
							}
						>
							<Moon />
							Toggle theme
						</CommandItem>
						<CommandItem onSelect={() => run(toggleSidebar)}>
							<PanelLeft />
							Toggle sidebar
						</CommandItem>
					</CommandGroup>
					{threads.length > 0 ? (
						<CommandGroup heading="Conversations">
							{threads.map((thread) => (
								<CommandItem
									key={thread.id}
									value={thread.id}
									keywords={[thread.title]}
									onSelect={() => run(() => onSelectThread(thread.id))}
								>
									<span className="flex size-4 items-center justify-center">
										<span className="size-[7px] rounded-full bg-muted-foreground/60" />
									</span>
									{thread.title}
								</CommandItem>
							))}
						</CommandGroup>
					) : null}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
