import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoSemanticItems } from "@/lib/demo-fixtures";
import { SemanticItemRow } from "./semantic-item";

const meta = {
	component: SemanticItemRow,
	title: "Memory/SemanticItemRow",
	// Rows are list items; the app always renders them inside a list.
	decorators: [
		(Story) => (
			<ul className="flex w-96 flex-col gap-2">
				<Story />
			</ul>
		),
	],
} satisfies Meta<typeof SemanticItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preference: Story = {
	args: { item: demoSemanticItems[0] },
};

export const FreshFact: Story = {
	args: { item: demoSemanticItems[1] },
};
