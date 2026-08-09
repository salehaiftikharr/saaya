"use client";

import type { ReactNode } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar({
	crumb,
	live,
	actions,
	onHome,
}: {
	crumb: string | null;
	live?: string;
	actions?: ReactNode;
	onHome: () => void;
}) {
	return (
		<header className="flex h-13 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator
				orientation="vertical"
				className="mr-1 data-vertical:h-4 data-vertical:self-auto"
			/>
			<Breadcrumb className="min-w-0">
				<BreadcrumbList className="flex-nowrap">
					<BreadcrumbItem>
						<BreadcrumbLink
							onClick={(event) => {
								event.preventDefault();
								onHome();
							}}
							href="/"
						>
							saaya
						</BreadcrumbLink>
					</BreadcrumbItem>
					{crumb && (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem className="min-w-0">
								<BreadcrumbPage className="truncate">{crumb}</BreadcrumbPage>
							</BreadcrumbItem>
						</>
					)}
				</BreadcrumbList>
			</Breadcrumb>
			{live && (
				<span
					className="shrink-0 text-muted-foreground text-xs"
					aria-live="polite"
				>
					{live}
				</span>
			)}
			<div className="ml-auto flex items-center gap-1">{actions}</div>
		</header>
	);
}
