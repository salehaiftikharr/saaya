import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { demoJobEvents } from "@/lib/demo-fixtures";
import { JobTimeline } from "./job-timeline";

const meta = {
	component: JobTimeline,
	title: "Work/JobTimeline",
} satisfies Meta<typeof JobTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullLedger: Story = {
	args: { events: [...demoJobEvents] },
};

export const FailureAndRefusal: Story = {
	args: {
		events: [
			{
				seq: 1,
				at: "2026-08-05T15:00:04Z",
				actor: "saaya",
				type: "step_started",
				payload: { n: 1, of: 2, intent: "Run the checks" },
			},
			{
				seq: 2,
				at: "2026-08-05T15:00:09Z",
				actor: "system",
				type: "policy_refused",
				payload: { detail: "curl is not on the command allowlist" },
			},
			{
				seq: 3,
				at: "2026-08-05T15:00:21Z",
				actor: "saaya",
				type: "step_failed",
				payload: { n: 1, error: "check exited 1: pricing behavior" },
			},
			{
				seq: 4,
				at: "2026-08-05T15:00:22Z",
				actor: "system",
				type: "job_recovered",
				payload: { from_state: "running" },
			},
			{
				seq: 5,
				at: "2026-08-05T15:01:02Z",
				actor: "saaya",
				type: "budget_exhausted",
				payload: { kind: "steps", budget: 2, completed: 2 },
			},
		],
	},
};
