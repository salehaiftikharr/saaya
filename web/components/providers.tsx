"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
	// Decorative animation pauses while the tab is hidden.
	useEffect(() => {
		const sync = () => {
			document.documentElement.toggleAttribute(
				"data-tab-hidden",
				document.hidden,
			);
		};
		sync();
		document.addEventListener("visibilitychange", sync);
		return () => document.removeEventListener("visibilitychange", sync);
	}, []);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			{children}
			<Toaster position="bottom-right" />
		</ThemeProvider>
	);
}
