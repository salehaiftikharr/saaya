"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/* shadcn's documented next-themes toggle pattern, reduced to a two-state
   switch. Both icons render and CSS picks one, so the button never flashes
   on hydration. */
export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label="Toggle theme"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
		>
			<Sun className="size-4 dark:hidden" />
			<Moon className="hidden size-4 dark:block" />
		</Button>
	);
}
