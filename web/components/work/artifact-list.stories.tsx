import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArtifactList } from "./artifact-list";

const meta = {
	component: ArtifactList,
	title: "Work/ArtifactList",
} satisfies Meta<typeof ArtifactList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReportAndPatch: Story = {
	args: {
		artifacts: [
			{
				id: "demo-artifact-1",
				job_id: "demo-job",
				path: "RELEASE_READINESS.md",
				kind: "report",
				title: "Atlas readiness report",
				content_type: "text/markdown",
				size: 2638,
				created_at: "2026-08-05T14:10:02Z",
			},
			{
				id: "demo-artifact-2",
				job_id: "demo-job",
				path: "fixes/pricing.patch",
				kind: "patch",
				title: "Pricing off-by-one fix",
				content_type: "text/x-diff",
				size: 412,
				created_at: "2026-08-05T14:12:40Z",
			},
		],
	},
};
