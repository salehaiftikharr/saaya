"use client";

import { ChatApp } from "@/components/chat/chat-app";
import { LoginScreen } from "@/components/shell/login-screen";
import { useSession } from "@/lib/use-session";

// Session first, app second: pollers and data fetches only mount once the
// door is open, so a locked API never renders as a sea of failures.
export function AppGate() {
	const session = useSession();

	if (session.loading) {
		return <main aria-busy="true" className="h-dvh w-full bg-background" />;
	}
	if (session.unreachable) {
		return (
			<main className="flex h-dvh w-full items-center justify-center bg-background p-6">
				<p className="max-w-sm text-center text-muted-foreground text-sm">
					Saaya's server is unreachable right now. It retries automatically;
					reload once the server is back.
				</p>
			</main>
		);
	}
	if (session.required && !session.authenticated) {
		return <LoginScreen onAuthenticated={session.refresh} />;
	}
	return <ChatApp />;
}
