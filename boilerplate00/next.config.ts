import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: require("path").join(__dirname),
  images: {
    remotePatterns: [{ hostname: "img.clerk.com" }],
  },
};

export default nextConfig;
