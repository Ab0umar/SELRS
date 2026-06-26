/**
 * Standalone Pentacam / Srv100 import service.
 *
 * Runs ONLY the folder-import + OCR-link + auto-link loops, in its own process,
 * separate from the main web server. The main server (server/_core/index.ts) no
 * longer starts these loops, so running `pnpm dev` / production never touches the
 * Pentacam Jpgs folder or uploads anything.
 *
 * Start it with:  pnpm pentacam:service
 *
 * The loops still honour the same env flags (SRV100_IMPORT_ENABLED,
 * SRV100_OCR_ENABLED, SRV100_IMPORT_SOURCE_DIR, ...). With those disabled
 * the service just logs "Disabled" and idles.
 */
import "dotenv/config";

// Tell the imported module NOT to launch the Express web server — we only want
// the background loops. Must be set before the dynamic import below runs.
process.env.SELRS_PENTACAM_SERVICE = "1";

async function main(): Promise<void> {
  const { startPentacamServices } = await import("../_core/index");
  await startPentacamServices();
  console.log("[pentacam-service] Running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("[pentacam-service] Fatal:", err);
  process.exit(1);
});
