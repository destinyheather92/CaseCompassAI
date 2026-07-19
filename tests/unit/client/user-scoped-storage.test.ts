// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getUserScopedItem,
  setUserScopedItem,
  removeUserScopedItem,
  clearAllLocalSessionData,
} from "@/lib/client/user-scoped-storage";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("setUserScopedItem / getUserScopedItem", () => {
  it("round-trips a value when local persistence is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    setUserScopedItem("user-1", "preferences", JSON.stringify({ reducedMotion: true }));
    expect(getUserScopedItem("user-1", "preferences")).toBe(JSON.stringify({ reducedMotion: true }));
  });

  it("never writes to storage when local persistence is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "false");
    setUserScopedItem("user-1", "preferences", "some-value");
    expect(getUserScopedItem("user-1", "preferences")).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("scopes storage per user — one user's value is invisible under another user's key", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    setUserScopedItem("user-1", "preferences", "user-1-value");
    expect(getUserScopedItem("user-2", "preferences")).toBeNull();
  });
});

describe("removeUserScopedItem", () => {
  it("removes a specific key regardless of the persistence flag", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    setUserScopedItem("user-1", "preferences", "value");
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "false");
    removeUserScopedItem("user-1", "preferences");
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    expect(getUserScopedItem("user-1", "preferences")).toBeNull();
  });
});

describe("clearAllLocalSessionData", () => {
  it("removes every CaseCompass-namespaced key from localStorage and sessionStorage", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    setUserScopedItem("user-1", "preferences", "a");
    setUserScopedItem("user-2", "preferences", "b");
    window.sessionStorage.setItem("casecompass:user-1:draft", "c");

    clearAllLocalSessionData();

    expect(getUserScopedItem("user-1", "preferences")).toBeNull();
    expect(getUserScopedItem("user-2", "preferences")).toBeNull();
    expect(window.sessionStorage.getItem("casecompass:user-1:draft")).toBeNull();
  });

  it("also clears the legacy fixed-key intake store persistence", () => {
    window.localStorage.setItem("casecompass-intake-v1", JSON.stringify({ state: { caseType: "criminal" } }));
    clearAllLocalSessionData();
    expect(window.localStorage.getItem("casecompass-intake-v1")).toBeNull();
  });

  it("does not remove unrelated keys belonging to other applications on the same device", () => {
    window.localStorage.setItem("some-other-app-key", "keep-me");
    clearAllLocalSessionData();
    expect(window.localStorage.getItem("some-other-app-key")).toBe("keep-me");
  });

  it("clears data even when the persistence flag is currently disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    setUserScopedItem("user-1", "preferences", "a");
    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "false");

    clearAllLocalSessionData();

    vi.stubEnv("NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE", "true");
    expect(getUserScopedItem("user-1", "preferences")).toBeNull();
  });
});
