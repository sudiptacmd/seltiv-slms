import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["mongoose", "@react-pdf/renderer"],
  // Type-checking is run separately (`npm run typecheck`) — it's too slow to
  // block every build on this project's size + the generated route types.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
