import type { LegalSourceProvider } from "./types";
import { curatedGlossaryProvider } from "./curated-glossary-provider";
import { liiProvider } from "./lii-provider";
import { courtListenerProvider } from "./courtlistener-provider";

/**
 * Providers are tried in order and the first hit wins. The curated glossary
 * is always first since it's the only source with a human-verified
 * plain-language definition already attached; external providers are
 * additive and only activate once credentials are configured.
 */
export const legalSourceProviders: LegalSourceProvider[] = [
  curatedGlossaryProvider,
  liiProvider,
  courtListenerProvider,
];
