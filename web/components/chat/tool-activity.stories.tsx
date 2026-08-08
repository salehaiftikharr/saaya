import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToolActivityList } from "./tool-activity";

const meta = {
	component: ToolActivityList,
	title: "Chat/ToolActivityList",
} satisfies Meta<typeof ToolActivityList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
	args: {
		live: true,
		activities: [{ id: "a1", name: "current_datetime", state: "running" }],
	},
};

export const Done: Story = {
	args: {
		activities: [
			{
				id: "a2",
				name: "current_datetime",
				state: "done",
				outputPreview: "Friday, August 07, 2026 at 23:33 EDT",
			},
		],
	},
};

export const RepeatedCallsCollapse: Story = {
	args: {
		activities: [
			{
				id: "b1",
				name: "remember",
				state: "done",
				outputPreview: "Saved: the Atlas demo runs on Thursdays.",
			},
			{
				id: "b2",
				name: "remember",
				state: "done",
				outputPreview: "Saved: Noor prefers weekly summaries in one page.",
			},
			{
				id: "b3",
				name: "remember",
				state: "done",
				outputPreview: "Saved: the staging checklist lives in the runbook.",
			},
			{
				id: "b4",
				name: "recall_memory",
				state: "done",
				outputPreview: "3 related memories found.",
			},
		],
	},
};

export const InterruptedTurn: Story = {
	args: {
		live: false,
		activities: [{ id: "c1", name: "word_count", state: "running" }],
	},
};
