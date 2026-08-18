import { afterEach, describe, expect, test } from "vitest";
import { selectAgency } from "@/live-map/agencyRoute";

afterEach(() => {
  window.history.pushState(null, "", "/");
});

describe("selectAgency", () => {
  test("puts the agency in the query string", () => {
    selectAgency("hololive");

    expect(window.location.search).toBe("?agency=hololive");
  });

  test("encodes an id that is not url-safe", () => {
    selectAgency("x-%E4%B8%AA");

    expect(new URLSearchParams(window.location.search).get("agency")).toBe(
      "x-%E4%B8%AA"
    );
  });

  test("drops the parameter when the selection clears", () => {
    selectAgency("hololive");
    selectAgency(null);

    expect(window.location.search).toBe("");
  });

  test("leaves a history entry so back returns to the map", () => {
    const before = window.history.length;
    selectAgency("hololive");

    expect(window.history.length).toBeGreaterThan(before);
  });

  test("keeps other query parameters", () => {
    window.history.pushState(null, "", "/?from=share");
    selectAgency("hololive");

    expect(new URLSearchParams(window.location.search).get("from")).toBe(
      "share"
    );
  });
});
