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
				text: "Writes commit messages in plain sentence case with no emojis.",
			},
			{
				kind: "constraint",
				text: "Release notes go out before the version tag is pushed.",
			},
			{ kind: "entity", text: "The team demo happens Thursday afternoons." },
		],
	},
};

export const Empty: Story = {
	args: { items: [] },
};
