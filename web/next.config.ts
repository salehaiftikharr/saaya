import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Dev-time proxy to the FastAPI server so the client stays origin-relative
	// and no CORS surface exists. Deployment puts both behind one origin.
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: "http://localhost:8000/api/:path*",
			},
		];
	},
};

export default nextConfig;
