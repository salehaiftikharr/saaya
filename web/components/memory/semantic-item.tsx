"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { SemanticItem } from "@/lib/memory-api";

export function SemanticItemRow({
	item,
	onForget,
	onCorrect,
}: {
	item: SemanticItem;
	onForget?: (id: string) => void;
	onCorrect?: (id: string, text: string) => void;
}) {
	const [confirmingForget, setConfirmingForget] = useState(false);
	const [correcting, setCorrecting] = useState(false);
	const [draft, setDraft] = useState(item.text);
	const reinforced =
		item.reinforcement_count > 0
			? `Used ${item.reinforcement_count} ${item.reinforcement_count === 1 ? "time" : "times"} since.`
			: "Not needed yet.";
	return (
		<li className="group flex flex-col gap-1.5 rounded-lg border bg-card p-3">
			<div className="flex items-start gap-2">
				<p className="min-w-0 flex-1 text-sm leading-relaxed">{item.text}</p>
				{(onForget || onCorrect) && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Actions for this memory`}
									className="size-7 opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
								>
									<MoreHorizontal className="size-4" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end">
							{onCorrect && (
								<DropdownMenuItem
									onClick={() => {
										setDraft(item.text);
										setCorrecting(true);
									}}
								>
									Correct
								</DropdownMenuItem>
							)}
							{onForget && (
								<DropdownMenuItem
									variant="destructive"
									onClick={() => setConfirmingForget(true)}
								>
									Forget
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
			<details>
				<summary className="cursor-pointer text-muted-foreground text-xs">
					Where this came from
				</summary>
				<p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
					Remembered as a {item.kind} on{" "}
					{new Date(item.learned_at).toLocaleDateString()}. {reinforced}{" "}
					Confidence {item.confidence.toFixed(1)}.
				</p>
			</details>

			<AlertDialog open={confirmingForget} onOpenChange={setConfirmingForget}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Forget this?</AlertDialogTitle>
						<AlertDialogDescription>
							It stops appearing in recall and in any future conversation
							context. The record itself is kept privately; nothing is erased.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep it</AlertDialogCancel>
						<AlertDialogAction onClick={() => onForget?.(item.id)}>
							Forget
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={correcting} onOpenChange={setCorrecting}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Correct this memory</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						The corrected version takes over recall; the old wording stays
						linked to it as a private audit trail.
					</p>
					<Input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-label="Corrected memory"
					/>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setCorrecting(false)}>
							Cancel
						</Button>
						<Button
							disabled={!draft.trim() || draft.trim() === item.text}
							onClick={() => {
								onCorrect?.(item.id, draft.trim());
								setCorrecting(false);
							}}
						>
							Save correction
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</li>
	);
}
