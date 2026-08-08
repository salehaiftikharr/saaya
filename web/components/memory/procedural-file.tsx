import { Lock } from "lucide-react";
import type { ProceduralFile } from "@/lib/memory-api";

export function ProceduralFileCard({ file }: { file: ProceduralFile }) {
	return (
		<article className="rounded-lg border bg-card">
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<span className="font-mono text-sm">{file.name}</span>
				{file.protected && (
					<span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-accent-foreground text-xs">
						<Lock aria-hidden className="size-3" />
						protected
					</span>
				)}
			</header>
			<pre className="overflow-x-auto whitespace-pre-wrap p-3 font-mono text-muted-foreground text-xs leading-relaxed">
				{file.content}
			</pre>
		</article>
	);
}
