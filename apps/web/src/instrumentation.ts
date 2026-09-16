/**
 * Next.js calls register() once when a server instance starts. Validating
 * configuration here means a bad deploy fails immediately rather than
 * erroring per-request in front of the clinic.
 *
 * Next logs a thrown error but keeps the process alive, which would leave a
 * broken container running, so configuration failures exit explicitly.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertProductionEnv } = await import("./lib/env");
  try {
    assertProductionEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[DentalOS] Configuration error — refusing to start:\n  ${message}\n`);
    process.exit(1);
  }
}
