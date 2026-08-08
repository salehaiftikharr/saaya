import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
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
