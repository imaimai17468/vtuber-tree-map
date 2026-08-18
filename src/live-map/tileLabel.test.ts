import { describe, expect, test } from "vitest";
import type { AgencyTile } from "@/live-map/treemapLayout";
import { fitsName, fitsStats } from "@/live-map/tileLabel";

const tile = (width: number, height: number): AgencyTile => ({
  agency: { id: "a", name: "A", liveCount: 1, totalViewers: 1 },
  x: 0,
  y: 0,
  width,
  height,
  viewerStep: 1,
});

describe("fitsName", () => {
  test("shows the name on a roomy tile", () => {
    expect(fitsName(tile(200, 120))).toBe(true);
  });

  test("hides the name on a tile too narrow for it", () => {
    expect(fitsName(tile(40, 200))).toBe(false);
  });

  test("hides the name on a tile too short for it", () => {
    expect(fitsName(tile(200, 20))).toBe(false);
  });
});

describe("fitsStats", () => {
  test("shows the stats on a roomy tile", () => {
    expect(fitsStats(tile(200, 120))).toBe(true);
  });

  test("hides the stats on a tile too short for them", () => {
    expect(fitsStats(tile(200, 40))).toBe(false);
  });

  test("hides the stats on a tall sliver whose name did not fit", () => {
    expect(fitsStats(tile(40, 400))).toBe(false);
  });
});
