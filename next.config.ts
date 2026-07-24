import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the multi-lockfile warning when building
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
