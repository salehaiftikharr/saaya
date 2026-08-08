import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProceduralFileCard } from "./procedural-file";

const meta = {
	component: ProceduralFileCard,
	title: "Memory/ProceduralFileCard",
} satisfies Meta<typeof ProceduralFileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Writable: Story = {
	args: {
		file: {
			name: "how-i-work.md",
			content:
				"# How I work together\n\n## Context\n\n- Release notes go out before the version tag is pushed.",
			protected: false,
		},
	},
};

export const Protected: Story = {
	args: {
		file: {
			name: "identity.md",
			content: "# Saaya identity (protected)\n\n- Saaya never stores secrets.",
			protected: true,
		},
	},
};
