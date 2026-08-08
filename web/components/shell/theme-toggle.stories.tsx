import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "./theme-toggle";

const meta = {
	component: ThemeToggle,
	title: "Shell/ThemeToggle",
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
