"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Loader2, TriangleAlert, History, ExternalLink } from "lucide-react";
import type { LegalTermDefinition } from "@/lib/legal-sources/types";
import { LegalSourceCard } from "@/components/resources/LegalSourceCard";

type Status = "idle" | "loading" | "success" | "no-results" | "error";

const HISTORY_KEY = "casecompass:glossary-recent-searches";
const MAX_HISTORY = 5;

const historyListeners = new Set<() => void>();

function subscribeHistory(callback: () => void) {
  historyListeners.add(callback);
  return () => historyListeners.delete(callback);
}

function getHistorySnapshot() {
  return window.localStorage.getItem(HISTORY_KEY) ?? "[]";
}

function getHistoryServerSnapshot() {
  return "[]";
}

/**
 * Recent-search history lives in localStorage, a client-only external store.
 * useSyncExternalStore reads it in a way that's safe during hydration
 * (falling back to the server snapshot on the first client render) without
 * needing a mount effect that calls setState.
 */
function useSearchHistory(): [string[], (next: string[]) => void] {
  const raw = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);
  const history = useMemo(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }, [raw]);

  const setHistory = (next: string[]) => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      historyListeners.forEach((callback) => callback());
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — history is a nice-to-have, not essential.
    }
  };

  return [history, setHistory];
}

function slugForUrl(term: string) {
  return term.trim().toLowerCase().replace(/\s+/g, "-");
}

type GlossarySearchProps = {
  initialTerm?: string;
};

export function GlossarySearch({ initialTerm }: GlossarySearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get("term");

  const [query, setQuery] = useState(initialTerm ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<LegalTermDefinition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useSearchHistory();

  const requestIdRef = useRef(0);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  async function runSearch(term: string, options?: { focusResult?: boolean }) {
    const trimmed = term.trim();
    if (!trimmed) return;

    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setMessage(null);
    setSuggestions([]);

    try {
      const response = await fetch("/api/legal-terms/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: trimmed, jurisdiction: "general" }),
      });
      const data = await response.json();

      if (requestId !== requestIdRef.current) return; // a newer search superseded this one

      if (data.status === "found") {
        setResult(data.definition);
        setStatus("success");
        setMessage(null);

        const nextHistory = [trimmed, ...history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          MAX_HISTORY,
        );
        setHistory(nextHistory);

        router.replace(`${pathname}?term=${slugForUrl(trimmed)}`, { scroll: false });

        if (options?.focusResult) {
          requestAnimationFrame(() => resultHeadingRef.current?.focus());
        }
      } else {
        setResult(null);
        setStatus(data.status === "not-found" ? "no-results" : "error");
        setMessage(data.message ?? "Something went wrong. Please try again.");
        setSuggestions(data.status === "not-found" && Array.isArray(data.suggestions) ? data.suggestions : []);
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResult(null);
      setStatus("error");
      setMessage("We couldn't reach the search service. Check your connection and try again.");
    }
  }

  const lastAutoSearchedTerm = useRef<string | null>(null);

  useEffect(() => {
    if (urlTerm && urlTerm !== lastAutoSearchedTerm.current) {
      lastAutoSearchedTerm.current = urlTerm;
      setQuery(urlTerm.replace(/-/g, " "));
      runSearch(urlTerm, { focusResult: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTerm]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    runSearch(query);
  }

  function handleClear() {
    requestIdRef.current += 1;
    setQuery("");
    setResult(null);
    setStatus("idle");
    setMessage(null);
    setSuggestions([]);
    router.replace(pathname, { scroll: false });
  }

  function handleRelatedTermClick(term: string) {
    setQuery(term);
    runSearch(term, { focusResult: true });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-cc-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a legal term, e.g. “res judicata”"
            maxLength={100}
            aria-label="Search for a legal term"
            className="w-full rounded-full border border-cc-border bg-cc-card py-3.5 pr-11 pl-11 text-sm text-cc-text placeholder:text-cc-muted/70 outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-cc-muted transition-colors hover:text-cc-text outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.3)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="size-4" aria-hidden="true" />
          )}
          Search
        </button>
      </form>

      {history.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-cc-muted">
            <History className="size-3.5" aria-hidden="true" />
            Recent:
          </span>
          {history.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                runSearch(term);
              }}
              className="rounded-full border border-cc-border bg-cc-card px-3 py-1 text-xs font-medium text-cc-muted transition-colors hover:border-cc-purple/50 hover:text-cc-text outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="mt-8">
        {status === "loading" && (
          <div className="flex items-center gap-3 rounded-2xl border border-cc-border bg-cc-card px-5 py-6 text-sm text-cc-muted">
            <Loader2 className="size-5 animate-spin text-cc-purple" aria-hidden="true" />
            Searching for a verified definition…
          </div>
        )}

        {status === "idle" && (
          <p className="rounded-2xl border border-dashed border-cc-border px-5 py-6 text-sm leading-relaxed text-cc-muted">
            Search for a legal term above to get a plain-language definition, an example, related
            concepts, and trusted sources.
          </p>
        )}

        {status === "no-results" && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-cc-border bg-cc-card px-5 py-6"
          >
            <Search className="mt-0.5 size-5 shrink-0 text-cc-muted" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-cc-muted">{message}</p>
              {suggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold tracking-widest text-cc-muted uppercase">
                    Did you mean
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => handleRelatedTermClick(term)}
                          className="rounded-full border border-cc-purple/40 bg-cc-purple/[0.06] px-3 py-1.5 text-xs font-medium text-cc-text transition-colors hover:border-cc-teal/50 hover:text-cc-teal outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border-2 border-cc-teal/40 bg-cc-teal/[0.06] px-5 py-6"
          >
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-cc-teal" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-cc-text">{message}</p>
          </div>
        )}

        {status === "success" && result && (
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                ref={resultHeadingRef}
                tabIndex={-1}
                className="text-xl font-extrabold text-cc-text outline-none sm:text-2xl"
              >
                {result.term}
              </h3>
              <span className="inline-flex items-center rounded-full border border-cc-purple/40 bg-cc-purple/10 px-3 py-1 text-xs font-semibold text-cc-purple">
                {result.category}
              </span>
            </div>

            <p className="mt-4 text-base leading-relaxed text-cc-text">
              {result.plainLanguageDefinition}
            </p>

            <div className="mt-5 rounded-xl border border-cc-border bg-cc-bg-secondary/60 p-4">
              <p className="text-xs font-bold tracking-widest text-cc-muted uppercase">
                Formal Definition
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-cc-muted">{result.formalDefinition}</p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold tracking-widest text-cc-muted uppercase">Example</p>
              <p className="mt-1.5 text-sm leading-relaxed text-cc-muted">{result.example}</p>
            </div>

            {result.relatedTerms.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold tracking-widest text-cc-muted uppercase">
                  Related Terms
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {result.relatedTerms.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => handleRelatedTermClick(term)}
                        className="rounded-full border border-cc-purple/40 bg-cc-purple/[0.06] px-3 py-1.5 text-xs font-medium text-cc-text transition-colors hover:border-cc-teal/50 hover:text-cc-teal outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.jurisdictionNote && (
              <p className="mt-5 text-xs leading-relaxed text-cc-muted italic">
                {result.jurisdictionNote}
              </p>
            )}

            {result.sources.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-bold tracking-widest text-cc-muted uppercase">
                  Sources
                </p>
                <div className="space-y-2">
                  {result.sources.map((source) => (
                    <LegalSourceCard key={source.url} {...source} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4 text-xs text-cc-muted/70">
              <span>Last verified {result.lastVerified}</span>
              <span className="flex items-center gap-1">
                <ExternalLink className="size-3" aria-hidden="true" />
                {result.disclaimer}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
