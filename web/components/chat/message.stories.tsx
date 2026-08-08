import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Message } from "./message";

const meta = {
	component: Message,
	title: "Chat/Message",
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const User: Story = {
	args: {
		message: {
			id: "1",
			role: "user",
			text: "What time is it right now?",
			activities: [],
		},
	},
};

export const Assistant: Story = {
	args: {
		message: {
			id: "2",
			role: "assistant",
			text: "It is Friday, August 7, 2026 at 11:33 PM EDT.",
			activities: [],
		},
	},
};

export const AssistantWorking: Story = {
	args: {
		streaming: true,
		message: {
			id: "3",
			role: "assistant",
			text: "",
			activities: [{ id: "a1", name: "current_datetime", state: "running" }],
		},
	},
};

export const AssistantWithTools: Story = {
	args: {
		message: {
			id: "4",
			role: "assistant",
			text: "It is Friday evening for you.",
			activities: [
				{
					id: "a2",
					name: "current_datetime",
					state: "done",
					outputPreview: "Friday, August 07, 2026 at 23:33 EDT",
				},
			],
		},
	},
};

export const AssistantError: Story = {
	args: {
		message: {
			id: "5",
			role: "assistant",
			text: "",
			activities: [],
			error: "The server closed the connection before the turn finished.",
		},
	},
};

export const AssistantMarkdown: Story = {
	args: {
		message: {
			id: "6",
			role: "assistant",
			text: "Here is the plan:\n\n1. **Check sponsorship** first\n2. Then review the stack\n\nUse `pnpm build` before pushing.",
			activities: [],
		},
	},
};
