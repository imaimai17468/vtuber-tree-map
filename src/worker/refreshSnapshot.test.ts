import { describe, expect, test, vi } from "vitest";
import { refreshSnapshot } from "@/worker/index";
import type { SnapshotStore } from "@/worker/snapshotStore";
import type { UpstreamClient, UpstreamStream } from "@/worker/upstream/types";

const NOW = 1_800_000_000_000;

const stream = (over: Partial<UpstreamStream> = {}): UpstreamStream => ({
  videoId: "v1",
  title: "配信",
  channelId: "c1",
  channelName: "Ch",
  channelPhoto: null,
  org: null,
  viewers: 10,
  startedAt: null,
  ...over,
});

const fakeStore = () => {
  const writeSnapshot = vi
    .fn<SnapshotStore["writeSnapshot"]>()
    .mockResolvedValue(undefined);
  const store: SnapshotStore = {
    readSnapshot: vi
      .fn<SnapshotStore["readSnapshot"]>()
      .mockResolvedValue(null),
    writeSnapshot,
  };
  return { store, writeSnapshot };
};

const fakeClient = (streams: readonly UpstreamStream[]): UpstreamClient => ({
  fetchLiveStreams: vi
    .fn<UpstreamClient["fetchLiveStreams"]>()
    .mockResolvedValue(streams),
});

describe("refreshSnapshot", () => {
  test("stamps the snapshot with the given time", async () => {
    const { store, writeSnapshot } = fakeStore();

    await refreshSnapshot(store, fakeClient([stream()]), NOW);

    expect(writeSnapshot.mock.calls[0]?.[0].updatedAt).toBe(
      new Date(NOW).toISOString()
    );
  });

  test("groups streams under the agency the upstream reported", async () => {
    const { store, writeSnapshot } = fakeStore();
    const client = fakeClient([stream({ org: "Hololive" })]);

    await refreshSnapshot(store, client, NOW);

    expect(
      writeSnapshot.mock.calls[0]?.[0].agencies.map((agency) => agency.name)
    ).toEqual(["Hololive"]);
  });

  test("leaves the previous snapshot in place when upstream fails", async () => {
    const { store, writeSnapshot } = fakeStore();
    const client: UpstreamClient = {
      fetchLiveStreams: vi
        .fn<UpstreamClient["fetchLiveStreams"]>()
        .mockRejectedValue(new Error("upstream down")),
    };

    await expect(refreshSnapshot(store, client, NOW)).rejects.toThrow(
      "upstream down"
    );
    expect(writeSnapshot).not.toHaveBeenCalled();
  });
});
