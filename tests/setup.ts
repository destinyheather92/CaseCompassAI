import { afterEach } from "vitest";

// Component tests run under jsdom (see @vitest-environment jsdom in those
// files); unit/integration tests run under node and have no `document`.
// Guard so this setup file works for both without erroring.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });
}
