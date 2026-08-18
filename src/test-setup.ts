import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only registers its own auto-cleanup when vitest runs with
// `globals: true`, which this project does not. Without this, rendered trees
// from earlier tests stay in the document and queries match across them.
afterEach(cleanup);

// jsdom implements no ResizeObserver, so any component measuring its own box
// throws on render without this. The stub observes nothing and never fires:
// jsdom has no layout to report, and inventing one would make a test assert a
// geometry the browser never produced. Tile geometry is covered directly
// through `layoutAgencies`, which needs no DOM.
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = NoopResizeObserver;
