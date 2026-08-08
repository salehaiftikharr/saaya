"use client";

import { FileCode2, FileText } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { type Artifact, artifactUrl } from "@/lib/jobs-api";

// Artifacts open in place, rendered by kind: markdown as prose, everything
// else as monospace. Content is fetched from the authenticated API with the
// same workspace guard the runner used to write it.
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
	const [open, setOpen] = useState<Artifact | null>(null);
	const [content, setContent] = useState<string | null>(null);

	const show = async (artifact: Artifact) => {
		setOpen(artifact);
		setContent(null);
		try {
			const response = await fetch(artifactUrl(artifact.job_id, artifact.id));
			setContent(
				response.ok
					? await response.text()
					: "This artifact could not be read.",
			);
		} catch {
			setContent("This artifact could not be read.");
		}
	};

	return (
		<>
			<ul className="flex flex-col gap-1.5">
				{artifacts.map((artifact) => {
					const Icon = artifact.kind === "patch" ? FileCode2 : FileText;
					return (
						<li key={artifact.id}>
							<button
								type="button"
								onClick={() => show(artifact)}
								className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-muted/50"
							>
								<Icon className="size-4 shrink-0 text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate">
									{artifact.title}
								</span>
								<span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
									{artifact.path}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			<Dialog
				open={open !== null}
				onOpenChange={(next) => !next && setOpen(null)}
			>
				<DialogContent className="flex max-h-[80dvh] flex-col gap-3 sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="text-base">{open?.title}</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{content === null ? (
							<p className="text-muted-foreground text-sm">Loading…</p>
						) : open?.content_type === "text/markdown" ? (
							<Streamdown mode="static">{content}</Streamdown>
						) : (
							<pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
								{content}
							</pre>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
