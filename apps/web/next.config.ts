import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dentalos/shared", "@dentalos/db", "@dentalos/meta"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
