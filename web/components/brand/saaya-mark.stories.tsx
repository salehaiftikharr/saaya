import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SaayaMark } from "./saaya-mark";

const meta = {
	component: SaayaMark,
	title: "Brand/SaayaMark",
} satisfies Meta<typeof SaayaMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FaviconSize: Story = {
	args: { className: "size-4" },
};

export const Large: Story = {
	args: { className: "size-16" },
};
