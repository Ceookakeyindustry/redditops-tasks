import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the multi-lockfile warning when deployed to Vercel
  turbopack: {
    root: process.cwd(),
  },
  // Enable output tracing for serverless functions on Vercel
  output: "standalone",
};

export default nextConfig;
