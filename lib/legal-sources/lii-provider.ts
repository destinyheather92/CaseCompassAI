import type { LegalSourceProvider } from "./types";

/**
 * Cornell Law School's Legal Information Institute (LII) publishes Wex, a
 * free legal encyclopedia, but does not offer a public definition API —
 * pulling live content would mean scraping, which its terms don't permit.
 *
 * This provider exists so the retrieval pipeline has a real second stop
 * once a licensed or first-party LII integration is available (Cornell LII
 * has occasionally made structured data available to partners). Until an
 * `LII_API_URL` / `LII_API_KEY` pair is configured, it stays a documented
 * no-op rather than scraping or guessing at content, so the service never
 * silently falls back to fabricated results.
 */
export const liiProvider: LegalSourceProvider = {
  name: "cornell-lii",
  async lookup() {
    if (!process.env.LII_API_URL) return null;

    // Intentionally unimplemented: no first-party LII definition API exists
    // yet. Wire a real fetch() here only once a licensed endpoint is
    // available, using LII_API_URL / LII_API_KEY from the environment.
    return null;
  },
};
