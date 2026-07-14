import type { LegalSourceProvider } from "./types";

/**
 * CourtListener (Free Law Project) exposes a real REST API, but it's built
 * for searching case law and dockets, not defining legal vocabulary — there
 * is no "define this term" endpoint. It's included here as a provider slot
 * for future work such as backing the Case Breakdown tool or resolving
 * citations, and to keep the term-lookup service from depending on any one
 * provider.
 *
 * Guarded behind COURTLISTENER_API_TOKEN so it never runs unconfigured, and
 * never falls back to guessing a definition from search results.
 */
export const courtListenerProvider: LegalSourceProvider = {
  name: "courtlistener",
  async lookup() {
    if (!process.env.COURTLISTENER_API_TOKEN) return null;

    // Intentionally unimplemented for the glossary use case — CourtListener
    // is case-law search, not a term-definition source. Left as a slot for
    // a future citation/case-lookup feature.
    return null;
  },
};
