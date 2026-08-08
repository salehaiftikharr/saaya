import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VersionRow } from "./version-row";

const meta = {
	component: VersionRow,
	title: "Memory/VersionRow",
	// Rows are list items; the app always renders them inside a list.
	decorators: [
		(Story) => (
			<ul className="flex w-96 flex-col gap-2">
				<Story />
			</ul>
		),
	],
	args: { onRollback: () => {} },
} satisfies Meta<typeof VersionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const entry = {
	version: 2,
	reason: "reflection over thread 898c85db",
	changed_files: ["how-i-work.md"],
	recorded_at: "2026-08-08T03:52:00Z",
};

export const Restorable: Story = {
	args: { entry, current: false, disabled: false },
};

export const Current: Story = {
	args: { entry: { ...entry, version: 4 }, current: true, disabled: false },
};
