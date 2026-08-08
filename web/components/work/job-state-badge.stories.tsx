import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { JobState } from "@/lib/jobs-api";
import { JobStateBadge } from "./job-state-badge";

const meta = {
	component: JobStateBadge,
	title: "Work/JobStateBadge",
} satisfies Meta<typeof JobStateBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL: JobState[] = [
	"draft",
	"queued",
	"planning",
	"waiting_approval",
	"running",
	"paused",
	"blocked",
	"retrying",
	"failed",
	"cancelled",
	"completed",
];

export const Running: Story = { args: { state: "running" } };
export const WaitingOnYou: Story = { args: { state: "waiting_approval" } };
export const Failed: Story = { args: { state: "failed" } };

export const EveryState: Story = {
	args: { state: "running" },
	render: () => (
		<ul className="flex flex-wrap gap-2" aria-label="Every job state">
			{ALL.map((state) => (
				<li key={state}>
					<JobStateBadge state={state} />
				</li>
			))}
		</ul>
	),
};
