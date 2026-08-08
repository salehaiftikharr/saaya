import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoThreads } from "@/lib/demo-fixtures";
import type { ThreadInfo } from "@/lib/threads-api";
import { ThreadList } from "./thread-list";

const meta = {
	component: ThreadList,
	title: "Chat/ThreadList",
	args: {
		disabled: false,
		onSelect: () => {},
		onRename: () => {},
		onArchive: () => {},
	},
	decorators: [
		(Story) => (
			<div className="flex h-96 w-64 flex-col border">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ThreadList>;

export default meta;
type Story = StoryObj<typeof meta>;

const threads = demoThreads as unknown as ThreadInfo[];

export const Grouped: Story = {
	args: { threads, activeThread: "demo-t1" },
};

export const Empty: Story = {
	args: { threads: [], activeThread: null },
};
