import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoDiff } from "@/lib/demo-fixtures";
import { MemoryDiff } from "./memory-diff";

const meta = {
	component: MemoryDiff,
	title: "About/MemoryDiff",
} satisfies Meta<typeof MemoryDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReleaseNoteLearning: Story = {
	args: {
		file: demoDiff.file,
		removed: demoDiff.removed,
		added: demoDiff.added,
	},
};
