import { describe, expect, test } from "vitest";
import { INDEPENDENT_AGENCY_ID, type AgencySummary } from "@/api";
import {
  layoutAgencies,
  VIEWER_STEP_COUNT,
  viewersPerLiver,
  viewerStepFor,
} from "@/live-map/treemapLayout";

const area = (subset: readonly { width: number; height: number }[]): number =>
  subset.reduce((sum, tile) => sum + tile.width * tile.height, 0);

const agency = (over: Partial<AgencySummary> = {}): AgencySummary => ({
  id: "hololive",
  name: "Hololive",
  liveCount: 1,
  totalViewers: 100,
  ...over,
});

describe("viewersPerLiver", () => {
  test("divides the audience by the streamers drawing it", () => {
    expect(
      viewersPerLiver(agency({ liveCount: 6, totalViewers: 77_829 }))
    ).toBeCloseTo(12_971.5, 1);
  });

  test("reads zero for an agency with nobody live", () => {
    expect(viewersPerLiver(agency({ liveCount: 0, totalViewers: 0 }))).toBe(0);
  });

  test("separates a concentrated audience from one spread thin", () => {
    const concentrated = viewersPerLiver(
      agency({ liveCount: 6, totalViewers: 77_829 })
    );
    const spread = viewersPerLiver(
      agency({ liveCount: 111, totalViewers: 26_311 })
    );

    expect(concentrated).toBeGreaterThan(spread);
  });
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

    expect(tiles.map((tile) => tile.agency.id).toSorted()).toEqual(["a", "b"]);
  });

  test("places the largest agency first", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: "small", liveCount: 1 }),
        agency({ id: "big", liveCount: 9 }),
      ],
      400,
      300
    );

    expect(tiles[0]?.agency.id).toBe("big");
  });

  test("places independents last even though it is the largest", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: INDEPENDENT_AGENCY_ID, liveCount: 59 }),
        agency({ id: "hololive", liveCount: 5 }),
        agency({ id: "nijisanji", liveCount: 6 }),
      ],
      400,
      300
    );

    expect(tiles.map((tile) => tile.agency.id)).toEqual([
      "nijisanji",
      "hololive",
      INDEPENDENT_AGENCY_ID,
    ]);
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

  test("gives independents the full-height column at the right edge", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: INDEPENDENT_AGENCY_ID, liveCount: 59 }),
        agency({ id: "hololive", liveCount: 5 }),
      ],
      400,
      300
    );
    const independents = tiles.filter(
      (tile) => tile.agency.id === INDEPENDENT_AGENCY_ID
    );

    expect(
      independents.map((tile) => ({
        rightEdge: tile.x + tile.width,
        top: tile.y,
        height: tile.height,
      }))
    ).toEqual([{ rightEdge: 400, top: 0, height: 300 }]);
  });

  test("sizes the independents column to its share of live streamers", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: INDEPENDENT_AGENCY_ID, liveCount: 60 }),
        agency({ id: "hololive", liveCount: 20 }),
        agency({ id: "nijisanji", liveCount: 20 }),
      ],
      400,
      300
    );
    const independentsArea = area(
      tiles.filter((tile) => tile.agency.id === INDEPENDENT_AGENCY_ID)
    );

    expect(independentsArea / area(tiles)).toBeCloseTo(0.6, 1);
  });

  test("uses the whole box when nobody is independent", () => {
    const tiles = layoutAgencies(
      [agency({ id: "a", liveCount: 3 }), agency({ id: "b", liveCount: 7 })],
      400,
      300
    );
    const rightEdge = Math.max(...tiles.map((tile) => tile.x + tile.width));

    expect(rightEdge).toBe(400);
  });

  test("keeps one-streamer agencies from collapsing into slivers", () => {
    // The live distribution measured on 2026-08-18: one dominant catch-all and a
    // long tail of agencies with a single streamer, which is what produced the
    // slivers.
    const counts = [10, 5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const tiles = layoutAgencies(
      [
        agency({
          id: INDEPENDENT_AGENCY_ID,
          liveCount: 63,
          totalViewers: 6_300,
        }),
        ...counts.map((liveCount, index) =>
          agency({
            id: `a${String(index)}`,
            liveCount,
            totalViewers: liveCount * 100,
          })
        ),
      ],
      1400,
      720
    );
    const worstAspect = Math.max(
      ...tiles.map(
        (tile) =>
          Math.max(tile.width, tile.height) / Math.min(tile.width, tile.height)
      )
    );

    expect(worstAspect).toBeLessThan(6);
  });

  test("colours by audience per streamer, not by the total", () => {
    // Same total audience; one agency concentrates it, the other spreads it.
    const tiles = layoutAgencies(
      [
        agency({ id: "few", liveCount: 2, totalViewers: 20_000 }),
        agency({ id: "many", liveCount: 40, totalViewers: 20_000 }),
      ],
      600,
      400
    );
    const stepOf = (id: string) =>
      tiles
        .filter((tile) => tile.agency.id === id)
        .map((tile) => tile.viewerStep);

    expect(stepOf("few")).not.toEqual(stepOf("many"));
  });

  test("gives the concentrated agency the darker end of the ramp", () => {
    const tiles = layoutAgencies(
      [
        agency({ id: "few", liveCount: 2, totalViewers: 20_000 }),
        agency({ id: "many", liveCount: 40, totalViewers: 20_000 }),
      ],
      600,
      400
    );
    const steps = (id: string) =>
      tiles
        .filter((tile) => tile.agency.id === id)
        .map((tile) => tile.viewerStep);
    const [few = 0] = steps("few");
    const [many = 0] = steps("many");

    expect(few).toBeGreaterThan(many);
  });

  test("returns nothing when there are no agencies", () => {
    expect(layoutAgencies([], 400, 300)).toEqual([]);
  });

  test("returns nothing before the container has been measured", () => {
    expect(layoutAgencies([agency()], 0, 0)).toEqual([]);
  });
});
