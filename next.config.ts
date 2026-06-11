import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A stray package-lock.json exists in the home directory above this project,
  // so Next.js otherwise infers the workspace root there. Pin tracing to this
  // project directory. The parent lockfile is left untouched (not ours).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
