import { afterEach, describe, expect, test, vi } from "vitest";
import type { UpstreamStream } from "@/worker/upstream/types";
import {
  createHolodexClient,
  HolodexError,
  normalizeOrg,
  withChannelOrgs,
} from "@/worker/upstream/holodex";

const stream = (over: Partial<UpstreamStream> = {}): UpstreamStream => ({
  videoId: "v1",
  title: "配信",
  channelId: "c1",
  channelName: "Ch",
  channelPhoto: null,
  org: null,
  viewers: 0,
  startedAt: null,
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeOrg", () => {
  test("keeps a real agency name", () => {
    expect(normalizeOrg("Hololive")).toBe("Hololive");
  });

  test("treats the independents label as no agency", () => {
    expect(normalizeOrg("Independents")).toBeNull();
  });

  test("treats a blank string as no agency", () => {
    expect(normalizeOrg("   ")).toBeNull();
  });

  test("treats a missing value as no agency", () => {
    expect(normalizeOrg(undefined)).toBeNull();
  });

  test("trims surrounding whitespace", () => {
    expect(normalizeOrg(" Nijisanji ")).toBe("Nijisanji");
  });
});

describe("withChannelOrgs", () => {
  test("fills in the agency from the channel map", () => {
    const filled = withChannelOrgs(
      [stream({ channelId: "c1" })],
      new Map([["c1", "Hololive"]])
    );

    expect(filled[0]?.org).toBe("Hololive");
  });

  test("leaves an agency the upstream already reported untouched", () => {
    const filled = withChannelOrgs(
      [stream({ channelId: "c1", org: "VSPO" })],
      new Map([["c1", "Hololive"]])
    );

    expect(filled[0]?.org).toBe("VSPO");
  });

  test("leaves a channel missing from the map as an independent", () => {
    const filled = withChannelOrgs(
      [stream({ channelId: "unknown" })],
      new Map()
    );

    expect(filled[0]?.org).toBeNull();
  });
});

describe("createHolodexClient", () => {
  test("maps a live video onto the upstream shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json([
          {
            id: "abc",
            title: "歌枠",
            status: "live",
            live_viewers: 4321,
            start_actual: "2026-08-18T00:00:00.000Z",
            channel: {
              id: "UC1",
              name: "さくらみこ Ch.",
              english_name: "Sakura Miko",
              photo: "https://example.test/miko.jpg",
              org: "Hololive",
            },
          },
        ])
      )
    );

    const streams = await createHolodexClient("key").fetchLiveStreams();

    expect(streams).toEqual([
      {
        videoId: "abc",
        title: "歌枠",
        channelId: "UC1",
        channelName: "Sakura Miko",
        channelPhoto: "https://example.test/miko.jpg",
        org: "Hololive",
        viewers: 4321,
        startedAt: "2026-08-18T00:00:00.000Z",
      },
    ]);
  });

  test("falls back to the native channel name when there is no english name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json([
          {
            id: "abc",
            title: "配信",
            status: "live",
            channel: { id: "UC1", name: "個人勢さん" },
          },
        ])
      )
    );

    const streams = await createHolodexClient("key").fetchLiveStreams();

    expect(streams[0]).toEqual({
      videoId: "abc",
      title: "配信",
      channelId: "UC1",
      channelName: "個人勢さん",
      channelPhoto: null,
      org: null,
      viewers: 0,
      startedAt: null,
    });
  });

  test("sends the api key as a header", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await createHolodexClient("secret-key").fetchLiveStreams();

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "X-APIKEY": "secret-key",
    });
  });

  test("raises HolodexError carrying the status on a failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("nope", { status: 429 }))
    );

    await expect(createHolodexClient("key").fetchLiveStreams()).rejects.toThrow(
      HolodexError
    );
  });

  test("stops paging channels once a short page arrives", async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) => ({
      id: `UC${String(index)}`,
      org: "Hololive",
    }));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(fullPage))
      .mockResolvedValueOnce(Response.json([{ id: "UClast", org: "VSPO" }]));
    vi.stubGlobal("fetch", fetchMock);

    const orgs = await createHolodexClient("key").fetchChannelOrgs();

    expect(orgs.size).toBe(51);
  });

  test("omits independents from the channel map", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json([{ id: "UC1", org: "Independents" }]))
    );

    const orgs = await createHolodexClient("key").fetchChannelOrgs();

    expect(orgs.size).toBe(0);
  });
});
