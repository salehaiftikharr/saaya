"use client";

import { useState } from "react";
import { SaayaMark } from "@/components/brand/saaya-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/use-session";

// The whole app behind one door: the owner's passphrase. Everything else
// stays unmounted until the session is real, so nothing polls a locked API.
export function LoginScreen({
	onAuthenticated,
}: {
	onAuthenticated: () => void;
}) {
	const [passphrase, setPassphrase] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		if (!passphrase || busy) return;
		setBusy(true);
		setError(null);
		const failure = await login(passphrase);
		setBusy(false);
		if (failure) {
			setError(failure);
			return;
		}
		onAuthenticated();
	};

	return (
		<main className="flex h-dvh w-full items-center justify-center bg-background p-6">
			<form
				aria-label="Unlock Saaya"
				className="flex w-full max-w-xs flex-col items-center gap-5"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<SaayaMark className="size-12 text-foreground" />
				<div className="text-center">
					<h1 className="type-display text-3xl">Saaya is locked</h1>
					<p className="mt-1.5 text-muted-foreground text-sm">
						Enter the owner passphrase to continue.
					</p>
				</div>
				<Input
					type="password"
					value={passphrase}
					onChange={(event) => setPassphrase(event.target.value)}
					aria-label="Owner passphrase"
					placeholder="Passphrase"
					autoFocus
					autoComplete="current-password"
				/>
				{error && (
					<p className="text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
				<Button type="submit" className="w-full" disabled={!passphrase || busy}>
					{busy ? "Checking…" : "Unlock"}
				</Button>
			</form>
		</main>
	);
}
