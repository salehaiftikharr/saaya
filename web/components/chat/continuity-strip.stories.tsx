import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContinuityStrip } from "./continuity-strip";

const meta = {
	component: ContinuityStrip,
	title: "Chat/ContinuityStrip",
} satisfies Meta<typeof ContinuityStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CarriedContext: Story = {
	args: {
		items: [
			{
				kind: "preference",
				text: "Writes git commits in plain sentence case with no emojis.",
			},
			{
				kind: "constraint",
				text: "Job-search help always checks visa sponsorship first.",
			},
			{ kind: "entity", text: "Portfolio site is saleha.live." },
		],
	},
};

export const Empty: Story = {
	args: { items: [] },
};
