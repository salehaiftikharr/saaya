import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToolRow } from "./tool-row";

const meta = {
	component: ToolRow,
	title: "Tools/ToolRow",
	args: { onActivate: () => {}, onDisable: () => {}, disabled: false },
	// Rows are list items; the app always renders them inside a list.
	decorators: [
		(Story) => (
			<ul className="flex w-[28rem] flex-col gap-2">
				<Story />
			</ul>
		),
	],
} satisfies Meta<typeof ToolRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const tool = {
	name: "reverse_text",
	description: "Reverses the text parameter.",
	params: { text: "string" },
	script:
		'import json, os\nparams = json.loads(os.environ["TOOL_INPUT"])\nprint(params["text"][::-1])',
	status: "draft",
	version: 1,
};

export const Draft: Story = { args: { tool } };

export const Active: Story = {
	args: { tool: { ...tool, status: "active", version: 2 } },
};

export const Disabled: Story = {
	args: { tool: { ...tool, status: "disabled" } },
};
