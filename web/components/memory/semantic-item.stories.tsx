import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
	args: {
		item: {
			id: "1",
			kind: "preference",
			text: "Writes commit messages in plain sentence case with no emojis.",
			confidence: 0.7,
			reinforcement_count: 3,
			learned_at: "2026-08-08T03:52:00Z",
		},
	},
};

export const FreshFact: Story = {
	args: {
		item: {
			id: "2",
			kind: "fact",
			text: "The team demo happens Thursday afternoons.",
			confidence: 0.7,
			reinforcement_count: 0,
			learned_at: "2026-08-08T03:52:00Z",
		},
	},
};
