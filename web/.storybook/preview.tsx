import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		// Accessibility violations fail the test run. Release gate, not advisory.
		a11y: {
			test: "error",
		},
	},
};

export default preview;
