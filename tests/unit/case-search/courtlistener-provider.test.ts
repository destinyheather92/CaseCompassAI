import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courtListenerCaseProvider } from "@/lib/case-search/courtlistener-provider";
import type { CaseSearchRequest } from "@/lib/case-search/types";

const originalToken = process.env.COURTLISTENER_API_TOKEN;
const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

const baseRequest: CaseSearchRequest = { jurisdiction: "SC", topics: ["habeas corpus"] };

describe("courtListenerCaseProvider.searchCases", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.COURTLISTENER_API_TOKEN;
    else process.env.COURTLISTENER_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("returns not-configured without calling fetch when no token is set", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    expect(result.status).toBe("not-configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps well-formed results and rejects malformed ones", async () => {
    process.env.COURTLISTENER_API_TOKEN = "test-token";
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            id: 123,
            caseName: "Smith v. State",
            court: "sc",
            dateFiled: "2019-05-01",
            citation: ["123 S.E.2d 456"],
            docketNumber: "2018-CP-01-001",
            absolute_url: "/opinion/123/smith-v-state/",
            precedential_status: "Published",
          },
          { caseName: "Missing everything else" },
        ],
        next: null,
      }),
    );

    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.page.cases).toHaveLength(1);
      const [caseResult] = result.page.cases;
      expect(caseResult.caseName).toBe("Smith v. State");
      expect(caseResult.providerCaseId).toBe("123");
      expect(caseResult.sourceUrl).toBe("https://www.courtlistener.com/opinion/123/smith-v-state/");
      expect(caseResult.publicationStatus).toBe("published");
      expect(caseResult.laterHistoryStatus).toBe("not-checked");
      expect(caseResult.verificationStatus).toBe("verified");
      expect(caseResult.verificationMethod).toBe("search-match");
      expect(caseResult.matchedTopics).toEqual(["habeas corpus"]);
      expect(caseResult.citations).toEqual(["123 S.E.2d 456"]);
      expect(caseResult.originalCollection).toBeNull();
    }
  });

  it("marks a result as originally from the Caselaw Access Project only when the provider's own metadata says so", async () => {
    process.env.COURTLISTENER_API_TOKEN = "test-token";
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ id: 1, caseName: "Old v. Case", court: "sc", absolute_url: "/opinion/1/old-v-case/", source: "Court website, CAP" }],
        next: null,
      }),
    );
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    if (result.status === "ok") {
      expect(result.page.cases[0].originalCollection).toBe("caselaw-access-project");
    } else {
      throw new Error("expected ok");
    }
  });

  it("never claims a case's later history has been checked", async () => {
    process.env.COURTLISTENER_API_TOKEN = "test-token";
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 1, caseName: "X v. Y", court: "sc", absolute_url: "/opinion/1/x-v-y/" }], next: null }),
    );
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    if (result.status === "ok") {
      expect(result.page.cases[0].laterHistoryStatus).toBe("not-checked");
    } else {
      throw new Error("expected ok");
    }
  });

  it("returns provider-error on a non-ok HTTP response, without throwing", async () => {
    process.env.COURTLISTENER_API_TOKEN = "test-token";
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    expect(result.status).toBe("provider-error");
  });

  it("returns provider-error (not a thrown exception) when the network call rejects", async () => {
    process.env.COURTLISTENER_API_TOKEN = "test-token";
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    expect(result.status).toBe("provider-error");
  });

  it("never includes the API token in a mapped result", async () => {
    process.env.COURTLISTENER_API_TOKEN = "super-secret-token";
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 1, caseName: "X v. Y", court: "sc", absolute_url: "/opinion/1/x-v-y/" }], next: null }),
    );
    const result = await courtListenerCaseProvider.searchCases(baseRequest);
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });
});

describe("courtListenerCaseProvider.getCaseById", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.COURTLISTENER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.COURTLISTENER_API_TOKEN;
    else process.env.COURTLISTENER_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("returns a mapped case for a found id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ id: 42, caseName: "Doe v. Roe", court: "sc", absolute_url: "/opinion/42/doe-v-roe/" }] }),
    );
    const result = await courtListenerCaseProvider.getCaseById("42");
    expect(result?.caseName).toBe("Doe v. Roe");
  });

  it("returns null when nothing is found", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const result = await courtListenerCaseProvider.getCaseById("does-not-exist");
    expect(result).toBeNull();
  });

  it("returns null (never throws) on a provider failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await courtListenerCaseProvider.getCaseById("42");
    expect(result).toBeNull();
  });
});

describe("courtListenerCaseProvider.getOpinionText", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.COURTLISTENER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.COURTLISTENER_API_TOKEN;
    else process.env.COURTLISTENER_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("returns null without calling fetch when no token is set", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers plain_text when present", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ plain_text: "  The court held that...  ", html: "<p>ignored</p>" }));
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBe("The court held that...");
  });

  it("falls back to stripped HTML when plain_text is empty", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ plain_text: "", html: "<p>The court <b>held</b> that&nbsp;X.</p>" }));
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBe("The court held that X.");
  });

  it("returns null when neither plain_text nor any html field is present", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBeNull();
  });

  it("returns null (never throws) on a provider failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBeNull();
  });

  it("returns null on a non-ok HTTP response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));
    const result = await courtListenerCaseProvider.getOpinionText("42");
    expect(result).toBeNull();
  });
});

describe("courtListenerCaseProvider.verifyCitation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.COURTLISTENER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.COURTLISTENER_API_TOKEN;
    else process.env.COURTLISTENER_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("returns source_unavailable without calling fetch when no token is set", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("source_unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns verified with the matched case for a single-cluster status-200 result", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          citation: "466 U.S. 668",
          status: 200,
          clusters: [{ id: 1, caseName: "Strickland v. Washington", court: "scotus", absolute_url: "/opinion/1/strickland/", citation: ["466 U.S. 668"] }],
        },
      ]),
    );
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("verified");
    if (result.status === "verified") {
      expect(result.matchedCase.caseName).toBe("Strickland v. Washington");
      expect(result.matchedCase.verificationMethod).toBe("citation-lookup");
    }
  });

  it("returns possible_match with candidates for a status-300 (ambiguous) result", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          citation: "1 U.S. 1",
          status: 300,
          clusters: [
            { id: 1, caseName: "Case A", court: "c1", absolute_url: "/opinion/1/a/" },
            { id: 2, caseName: "Case B", court: "c2", absolute_url: "/opinion/2/b/" },
          ],
        },
      ]),
    );
    const result = await courtListenerCaseProvider.verifyCitation("1 U.S. 1");
    expect(result.status).toBe("possible_match");
    if (result.status === "possible_match") {
      expect(result.candidates).toHaveLength(2);
    }
  });

  it("returns not_verified for a status-404 (valid citation shape, not found) result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ citation: "999 U.S. 999", status: 404, clusters: [] }]));
    const result = await courtListenerCaseProvider.verifyCitation("999 U.S. 999");
    expect(result.status).toBe("not_verified");
  });

  it("returns not_verified for a status-400 (malformed/unknown reporter) result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ citation: "not a citation", status: 400, clusters: [] }]));
    const result = await courtListenerCaseProvider.verifyCitation("not a citation");
    expect(result.status).toBe("not_verified");
  });

  it("returns not_verified when the provider returns no entries at all", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("not_verified");
  });

  it("returns source_unavailable on a per-entry status-429 (rate limited)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ citation: "466 U.S. 668", status: 429, clusters: [] }]));
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("source_unavailable");
  });

  it("returns source_unavailable on an HTTP-level 429", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => [] } as Response);
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("source_unavailable");
  });

  it("returns source_unavailable (never throws) when the network call rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(result.status).toBe("source_unavailable");
  });

  it("sends the citation as POST JSON body, never as a URL query string", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ citation: "466 U.S. 668", status: 404, clusters: [] }]));
    await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain("466");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "466 U.S. 668" });
  });
});

describe("courtListenerCaseProvider.getCitingCases / getCitedCases", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.COURTLISTENER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.COURTLISTENER_API_TOKEN;
    else process.env.COURTLISTENER_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it("returns not-configured without calling fetch when no token is set", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    const result = await courtListenerCaseProvider.getCitingCases("100");
    expect(result.status).toBe("not-configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns source-unavailable for an invalid (potentially unsafe) case id, without calling fetch", async () => {
    const result = await courtListenerCaseProvider.getCitingCases("../../etc");
    expect(result.status).toBe("source-unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hydrates citing-opinion edges into full case metadata with a 'cited' treatment and depth", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { id: 1, citing_opinion: "https://www.courtlistener.com/api/rest/v4/opinions/200/", cited_opinion: "https://www.courtlistener.com/api/rest/v4/opinions/100/", depth: 3 },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 200, caseName: "Later Case", court: "sc", absolute_url: "/opinion/200/later/" }] }));

    const result = await courtListenerCaseProvider.getCitingCases("100");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.cases).toHaveLength(1);
      expect(result.cases[0].case.caseName).toBe("Later Case");
      expect(result.cases[0].treatment).toBe("cited");
      expect(result.cases[0].depth).toBe(3);
    }
  });

  it("never claims a treatment beyond 'cited' — the type system only allows that value", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ id: 1, citing_opinion: "https://www.courtlistener.com/api/rest/v4/opinions/200/", cited_opinion: "https://www.courtlistener.com/api/rest/v4/opinions/100/", depth: 1 }] }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 200, caseName: "Later Case", court: "sc", absolute_url: "/opinion/200/later/" }] }));
    const result = await courtListenerCaseProvider.getCitingCases("100");
    if (result.status === "ok") {
      expect(result.cases.every((c) => c.treatment === "cited")).toBe(true);
    }
  });

  it("returns source-unavailable (never throws) on a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await courtListenerCaseProvider.getCitedCases("100");
    expect(result.status).toBe("source-unavailable");
  });

  it("returns an ok result with an empty cases array when there are no edges", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const result = await courtListenerCaseProvider.getCitedCases("100");
    expect(result).toEqual({ status: "ok", cases: [] });
  });

  it("caps the number of related cases hydrated at MAX_RELATED_CASES", async () => {
    const edges = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      citing_opinion: `https://www.courtlistener.com/api/rest/v4/opinions/${200 + i}/`,
      cited_opinion: "https://www.courtlistener.com/api/rest/v4/opinions/100/",
      depth: 1,
    }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: edges }));
    // One hydration call per unique related case, capped well below 15.
    for (let i = 0; i < 10; i++) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: 200 + i, caseName: `Case ${i}`, court: "sc", absolute_url: `/opinion/${200 + i}/case/` }] }));
    }
    const result = await courtListenerCaseProvider.getCitingCases("100");
    if (result.status === "ok") {
      expect(result.cases.length).toBeLessThanOrEqual(10);
    }
  });

  it("uses cited_opinion as the query param for getCitingCases (who cites this opinion)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    await courtListenerCaseProvider.getCitingCases("100");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("cited_opinion=100");
  });

  it("uses citing_opinion as the query param for getCitedCases (what this opinion cites)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    await courtListenerCaseProvider.getCitedCases("100");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("citing_opinion=100");
  });
});
