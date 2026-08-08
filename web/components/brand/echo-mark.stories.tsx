import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EchoMark } from "./echo-mark";

const meta = {
	component: EchoMark,
	title: "Brand/EchoMark",
	args: { className: "size-16 text-foreground" },
} satisfies Meta<typeof EchoMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { state: "idle" } };
export const Listening: Story = { args: { state: "listening" } };
export const Thinking: Story = { args: { state: "thinking" } };
export const UsingATool: Story = { args: { state: "tool" } };
export const Heartbeat: Story = { args: { state: "heartbeat" } };
export const Success: Story = { args: { state: "success" } };
export const Reconnecting: Story = { args: { state: "reconnecting" } };
export const Failure: Story = { args: { state: "failure" } };

export const ReducedMotion: Story = {
	globals: { reducedMotion: "reduce" },
	args: { state: "thinking" },
};
