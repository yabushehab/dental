import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for container deploys (Docker/Render/Fly).
  // Ignored by Vercel, which builds its own output.
  output: "standalone",
  // In a monorepo, tracing must start at the workspace root so shared
  // packages and the Prisma engine are copied into the standalone bundle.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@dentalos/shared", "@dentalos/db", "@dentalos/meta"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Packages marked external are resolved at runtime, and file tracing does
  // not follow the Prisma client through the workspace package, so the
  // generated client and its native query engine must be included by hand —
  // without this the standalone server starts but fails on its first query.
  outputFileTracingIncludes: {
    "**/*": ["../../node_modules/.pnpm/@prisma+client*/node_modules/**"],
  },
};

export default nextConfig;
