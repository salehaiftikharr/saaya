import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Standalone output feeds the self-hosted Docker image; Vercel's builder
	// requires the default layout and fails file tracing under standalone,
	// so builds running there opt out (Vercel sets VERCEL=1).
	output: process.env.VERCEL ? undefined : "standalone",
	// Proxy to the FastAPI server so the client stays origin-relative and no
	// CORS surface exists; SAAYA_API_URL points at the server in compose.
	async rewrites() {
		const api = process.env.SAAYA_API_URL ?? "http://localhost:8000";
		return [
			{
				source: "/api/:path*",
				destination: `${api}/api/:path*`,
			},
		];
	},
};

export default nextConfig;
