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
      expect(caseResult.matchedTopics).toEqual(["habeas corpus"]);
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
