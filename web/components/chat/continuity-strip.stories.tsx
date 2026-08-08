import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoContinuity } from "@/lib/demo-fixtures";
import { ContinuityStrip } from "./continuity-strip";

const meta = {
	component: ContinuityStrip,
	title: "Chat/ContinuityStrip",
} satisfies Meta<typeof ContinuityStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CarriedContext: Story = {
	args: { items: [...demoContinuity] },
};

export const Empty: Story = {
	args: { items: [] },
};
