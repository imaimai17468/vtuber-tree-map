import { describe, expect, test } from "vitest";
import type { AgencySummary } from "@/api";
import {
  layoutAgencies,
  VIEWER_STEP_COUNT,
  viewerStepFor,
} from "@/live-map/treemapLayout";

const agency = (over: Partial<AgencySummary> = {}): AgencySummary => ({
  id: "hololive",
  name: "Hololive",
  liveCount: 1,
  totalViewers: 100,
  ...over,
});

describe("viewerStepFor", () => {
  test("puts the largest total on the darkest step", () => {
    expect(viewerStepFor(100_000, 100, 100_000)).toBe(VIEWER_STEP_COUNT);
  });

  test("puts the smallest total on the lightest step", () => {
    expect(viewerStepFor(100, 100, 100_000)).toBe(1);
  });

  test("spreads a realistic spread across most of the ramp", () => {
    const steps = [3_539, 7_895, 13_943, 119_325, 316_033].map((total) =>
      viewerStepFor(total, 3_539, 316_033)
    );

    expect(new Set(steps).size).toBeGreaterThanOrEqual(4);
  });

  test("separates totals that a linear scale would collapse together", () => {
    expect(viewerStepFor(100, 50, 100_000)).not.toBe(
      viewerStepFor(5_000, 50, 100_000)
    );
  });

  test("stays on the lightest step when every agency has the same total", () => {
    expect(viewerStepFor(500, 500, 500)).toBe(1);
  });

  test("stays on the lightest step when nobody has viewers", () => {
    expect(viewerStepFor(0, 0, 0)).toBe(1);
  });
});

describe("layoutAgencies", () => {
  test("gives every agency a tile", () => {
    const tiles = layoutAgencies(
      [agency({ id: "a" }), agency({ id: "b" })],
      400,
      300
    );

    expect(tiles.map((tile) => tile.agency.id)).toEqual(["a", "b"]);
  });

  test("gives the agency with more live streamers the larger area", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: "big", liveCount: 10 }),
        agency({ id: "small", liveCount: 1 }),
      ],
      400,
      300
    );
    const [bigArea = 0, smallArea = 0] = tiles.map(
      (tile) => tile.width * tile.height
    );

    expect(bigArea).toBeGreaterThan(smallArea);
  });

  test("keeps every tile inside the box", () => {
    const tiles = layoutAgencies(
      [agency({ id: "a", liveCount: 3 }), agency({ id: "b", liveCount: 7 })],
      400,
      300
    );

    const overflowing = [
      ...tiles.filter((tile) => tile.x + tile.width > 400),
      ...tiles.filter((tile) => tile.y + tile.height > 300),
    ];

    expect(overflowing).toEqual([]);
  });

  test("returns nothing when there are no agencies", () => {
    expect(layoutAgencies([], 400, 300)).toEqual([]);
  });

  test("returns nothing before the container has been measured", () => {
    expect(layoutAgencies([agency()], 0, 0)).toEqual([]);
  });
});
