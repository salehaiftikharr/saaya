import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoJobApproval } from "@/lib/demo-fixtures";
import { ApprovalCard } from "./approval-card";

const meta = {
	component: ApprovalCard,
	title: "Work/ApprovalCard",
} satisfies Meta<typeof ApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WaitingOnYou: Story = {
	args: {
		approval: { ...demoJobApproval, decision: null, decided_at: null },
		onDecide: () => {},
	},
};

export const Approved: Story = {
	args: { approval: demoJobApproval },
};

export const Rejected: Story = {
	args: { approval: { ...demoJobApproval, decision: "rejected" } },
};
