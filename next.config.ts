import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it out of the bundle.
  serverExternalPackages: ["better-sqlite3"],
  // The home dir also has a lockfile; pin the workspace root to silence the warning.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
