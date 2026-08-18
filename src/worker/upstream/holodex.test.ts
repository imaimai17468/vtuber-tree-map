import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createHolodexClient,
  HolodexError,
  normalizeOrg,
  preferredName,
} from "@/worker/upstream/holodex";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preferredName", () => {
  test("prefers the english name when there is one", () => {
    expect(preferredName("Sakura Miko", "さくらみこ Ch.")).toBe("Sakura Miko");
  });

  test("falls back when the english name is the empty string", () => {
    expect(preferredName("", "Maygi")).toBe("Maygi");
  });

  test("falls back when the english name is only whitespace", () => {
    expect(preferredName("  ", "Maygi")).toBe("Maygi");
  });

  test("falls back when there is no english name at all", () => {
    expect(preferredName(undefined, "Maygi")).toBe("Maygi");
  });
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

  test("uses the native channel name when there is no english name", async () => {
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

  test("uses the native channel name when the english name is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json([
          {
            id: "abc",
            title: "配信",
            status: "live",
            channel: { id: "UC1", name: "Maygi", english_name: "" },
          },
        ])
      )
    );

    const streams = await createHolodexClient("key").fetchLiveStreams();

    expect(streams[0]?.channelName).toBe("Maygi");
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
});
