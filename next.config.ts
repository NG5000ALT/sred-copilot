import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // native addon: must not be bundled
  serverExternalPackages: ["@surrealdb/node", "@surrealdb/node-native"],
};

export default nextConfig;
