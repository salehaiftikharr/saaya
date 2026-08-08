import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SurfaceStatus } from "./surface-status";

const meta = {
	component: SurfaceStatus,
	title: "Shell/SurfaceStatus",
} satisfies Meta<typeof SurfaceStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllUp: Story = {
	args: { snapshot: { web: "ok", slack: "connected", mcp: "enabled" } },
};

export const PartiallyOff: Story = {
	args: { snapshot: { web: "ok", slack: "off", mcp: "off" } },
};

export const Reconnecting: Story = {
	args: { snapshot: "offline" },
};
