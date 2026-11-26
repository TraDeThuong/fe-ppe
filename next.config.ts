import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    const aiEngineUrl = (
      process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return [
      {
        source: "/api/ai-test/:resource(models|upload)",
        destination: `${aiEngineUrl}/api/:resource`,
      },
      {
        source: "/api/ai-test/live/evidence/:filename",
        destination: `${aiEngineUrl}/api/live/evidence/:filename`,
      },
      {
        source: "/api/ai-test/jobs/:path*",
        destination: "/api/ai-test/studio/jobs/:path*",
      },
      {
        source: "/api/live/:path*",
        destination: `${aiEngineUrl}/api/live/:path*`,
      },
      {
        source: "/api/jobs/:path*",
        destination: "/api/ai-test/studio/jobs/:path*",
      },
    ];
  },
};

export default nextConfig;
