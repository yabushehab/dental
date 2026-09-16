/**
 * Production environment validation, run from instrumentation.ts when the
 * server boots, so a misconfigured deploy fails loudly instead of silently
 * running with a development fallback secret.
 *
 * `next build` also runs with NODE_ENV=production but has no runtime secrets,
 * so the build phase is skipped explicitly.
 */

const REQUIRED_IN_PRODUCTION = ["DATABASE_URL", "AUTH_SECRET"] as const;

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) in production: ${missing.join(", ")}. ` +
        `See docs/DEPLOYMENT.md.`,
    );
  }

  const authSecret = process.env.AUTH_SECRET!;
  if (authSecret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be at least 32 characters in production. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  if (authSecret === "change-me" || authSecret === "dev-only-secret-change-me") {
    throw new Error("AUTH_SECRET is still set to the example value — generate a real secret.");
  }
}
