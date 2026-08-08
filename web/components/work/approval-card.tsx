"use client";

import { Check, ShieldQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Approval } from "@/lib/jobs-api";

// The trust surface for one gated action: exactly what will happen, then a
// decision. The backend re-checks the recorded decision at execution, so
// these buttons are a request, never the enforcement.
export function ApprovalCard({
	approval,
	onDecide,
}: {
	approval: Approval;
	onDecide?: (id: string, decision: "approved" | "rejected") => void;
}) {
	const pending = approval.decision === null;
	return (
		<div className="flex flex-col gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
			<div className="flex items-center gap-2">
				<ShieldQuestion className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
				<span className="font-medium text-sm">
					{pending
						? "Saaya is waiting on you"
						: approval.decision === "approved"
							? "You approved this"
							: "You rejected this"}
				</span>
			</div>
			<p className="font-mono text-muted-foreground text-xs leading-relaxed">
				{approval.preview}
			</p>
			{pending && onDecide ? (
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="gap-1.5"
						onClick={() => onDecide(approval.id, "approved")}
					>
						<Check className="size-3.5" />
						Approve and continue
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="gap-1.5"
						onClick={() => onDecide(approval.id, "rejected")}
					>
						<X className="size-3.5" />
						Reject
					</Button>
				</div>
			) : (
				<p className="text-muted-foreground text-xs">
					{pending
						? "The job stays paused until you decide."
						: "The decision is recorded in the job ledger."}
				</p>
			)}
		</div>
	);
}
