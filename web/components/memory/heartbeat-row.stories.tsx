import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeartbeatRow } from "./heartbeat-row";

const meta = {
	component: HeartbeatRow,
	title: "Memory/HeartbeatRow",
	// Rows are list items; the app always renders them inside a list.
	decorators: [
		(Story) => (
			<ul className="flex w-96 flex-col gap-2">
				<Story />
			</ul>
		),
	],
} satisfies Meta<typeof HeartbeatRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {
	args: {
		run: {
			name: "reflect",
			outcome: "completed",
			detail: "abdabe72: applied",
			started_at: "2026-08-08T04:04:15Z",
			finished_at: "2026-08-08T04:04:16Z",
		},
	},
};

export const RejectedWithRules: Story = {
	args: {
		run: {
			name: "reflect",
			outcome: "completed",
			detail: "abdabe72: rejected (growth-cap,credential)",
			started_at: "2026-08-08T04:04:15Z",
			finished_at: "2026-08-08T04:04:16Z",
		},
	},
};

export const Failed: Story = {
	args: {
		run: {
			name: "reflect",
			outcome: "failed",
			detail: "database connection refused",
			started_at: "2026-08-08T04:04:15Z",
			finished_at: null,
		},
	},
};

export const QuietRun: Story = {
	args: {
		run: {
			name: "reflect",
			outcome: "completed",
			detail: "abdabe72: skipped",
			started_at: "2026-08-08T04:04:15Z",
			finished_at: "2026-08-08T04:04:16Z",
		},
	},
};
