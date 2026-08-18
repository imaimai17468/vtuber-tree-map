import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only registers its own auto-cleanup when vitest runs with
// `globals: true`, which this project does not. Without this, rendered trees
// from earlier tests stay in the document and queries match across them.
afterEach(cleanup);
