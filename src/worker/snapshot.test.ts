import { describe, expect, test } from "vitest";
import { INDEPENDENT_AGENCY_ID, INDEPENDENT_AGENCY_NAME } from "@/api";
import { agencyIdFromName, buildSnapshot } from "@/worker/snapshot";
import type { UpstreamStream } from "@/worker/upstream/types";

const stream = (over: Partial<UpstreamStream> = {}): UpstreamStream => ({
  videoId: "v1",
  title: "配信",
  channelId: "c1",
  channelName: "Ch",
  channelPhoto: null,
  org: "Hololive",
  viewers: 100,
  startedAt: null,
  ...over,
});

describe("agencyIdFromName", () => {
  test("slugifies a latin name", () => {
    expect(agencyIdFromName("Nijisanji EN")).toBe("nijisanji-en");
  });

  test("trims separators produced at the edges", () => {
    expect(agencyIdFromName("  VSPO!  ")).toBe("vspo");
  });

  test("falls back to an encoded id when a name has no latin characters", () => {
    expect(agencyIdFromName("ぶいすぽっ")).toBe(
      `x-${encodeURIComponent("ぶいすぽっ")}`
    );
  });

  test("keeps names that differ only outside the latin range distinct", () => {
    expect(agencyIdFromName("あ")).not.toBe(agencyIdFromName("い"));
  });
});

describe("buildSnapshot", () => {
  test("sums viewers and counts streams per agency", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "a", viewers: 100 }),
        stream({ videoId: "b", viewers: 250 }),
      ],
      "2026-08-18T00:00:00.000Z"
    );

    expect(snapshot.agencies).toEqual([
      { id: "hololive", name: "Hololive", liveCount: 2, totalViewers: 350 },
    ]);
  });

  test("buckets streams with no org under the independents agency", () => {
    const snapshot = buildSnapshot([stream({ org: null })], "t");

    expect(snapshot.agencies[0]).toEqual({
      id: INDEPENDENT_AGENCY_ID,
      name: INDEPENDENT_AGENCY_NAME,
      liveCount: 1,
      totalViewers: 100,
    });
  });

  test("orders agencies by live count, not by viewers", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "a", org: "Small", viewers: 90_000 }),
        stream({ videoId: "b", org: "Big", viewers: 1 }),
        stream({ videoId: "c", org: "Big", viewers: 1 }),
      ],
      "t"
    );

    expect(snapshot.agencies.map((a) => a.id)).toEqual(["big", "small"]);
  });

  test("breaks a live-count tie on id so the layout is deterministic", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "a", org: "Zeta" }),
        stream({ videoId: "b", org: "Alpha" }),
      ],
      "t"
    );

    expect(snapshot.agencies.map((a) => a.id)).toEqual(["alpha", "zeta"]);
  });

  test("orders each agency's streams by viewers descending", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "low", viewers: 10 }),
        stream({ videoId: "high", viewers: 900 }),
      ],
      "t"
    );

    expect(snapshot.streamsByAgency["hololive"]?.map((s) => s.videoId)).toEqual(
      ["high", "low"]
    );
  });

  test("carries the timestamp through untouched", () => {
    expect(buildSnapshot([], "2026-08-18T00:00:00.000Z").updatedAt).toBe(
      "2026-08-18T00:00:00.000Z"
    );
  });

  test("drops a stream nobody is watching", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "watched", viewers: 5 }),
        stream({ videoId: "empty", viewers: 0 }),
      ],
      "t"
    );

    expect(snapshot.streamsByAgency["hololive"]?.map((s) => s.videoId)).toEqual(
      ["watched"]
    );
  });

  test("does not count an unwatched stream toward the live count", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "watched", viewers: 5 }),
        stream({ videoId: "empty", viewers: 0 }),
      ],
      "t"
    );

    expect(snapshot.agencies[0]?.liveCount).toBe(1);
  });

  test("drops an agency whose only stream is unwatched", () => {
    const snapshot = buildSnapshot(
      [
        stream({ videoId: "watched", org: "Hololive", viewers: 5 }),
        stream({ videoId: "empty", org: "Limnos", viewers: 0 }),
      ],
      "t"
    );

    expect(snapshot.agencies.map((agency) => agency.id)).toEqual(["hololive"]);
  });

  test("produces an empty snapshot when nothing is live", () => {
    const snapshot = buildSnapshot([], "t");

    expect(snapshot.agencies).toEqual([]);
  });
});
