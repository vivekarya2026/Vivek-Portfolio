import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "*.appwrite.io" },
      { protocol: "https", hostname: "cloud.appwrite.io" },
    ],
  },
};

export default nextConfig;
