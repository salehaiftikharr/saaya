import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToolActivityChip } from "./tool-activity";

const meta = {
	component: ToolActivityChip,
	title: "Chat/ToolActivityChip",
} satisfies Meta<typeof ToolActivityChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
	args: { activity: { id: "a1", name: "current_datetime", state: "running" } },
};

export const Done: Story = {
	args: {
		activity: {
			id: "a2",
			name: "current_datetime",
			state: "done",
			outputPreview: "Friday, August 07, 2026 at 23:33 EDT",
		},
	},
};
