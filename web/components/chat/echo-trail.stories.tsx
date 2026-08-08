import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EchoTrail } from "./echo-trail";

const meta = {
	component: EchoTrail,
	title: "Chat/EchoTrail",
} satisfies Meta<typeof EchoTrail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {};

export const ReducedMotion: Story = {
	globals: { reducedMotion: "reduce" },
};
