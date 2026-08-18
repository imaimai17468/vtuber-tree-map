import {
  INDEPENDENT_AGENCY_ID,
  INDEPENDENT_AGENCY_NAME,
  type AgencySummary,
  type LiveStream,
} from "@/api";
import type { UpstreamStream } from "@/worker/upstream/types";

export type Snapshot = {
  readonly updatedAt: string;
  readonly agencies: readonly AgencySummary[];
  /** Keyed by `AgencySummary.id`. */
  readonly streamsByAgency: Readonly<Record<string, readonly LiveStream[]>>;
};

/**
 * Derives a stable id from an agency name. Ids appear in URLs, so they must not
 * change when unrelated agencies come and go — deriving from the name alone
 * keeps them independent of the snapshot's contents.
 */
export const agencyIdFromName = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  // Non-latin names slug to the empty string; fall back to a stable encoding of
  // the original so two such agencies never collide on one id.
  return slug === "" ? `x-${encodeURIComponent(name)}` : slug;
};

const toLiveStream = (stream: UpstreamStream): LiveStream => ({
  videoId: stream.videoId,
  title: stream.title,
  channelId: stream.channelId,
  channelName: stream.channelName,
  channelPhoto: stream.channelPhoto,
  viewers: stream.viewers,
  startedAt: stream.startedAt,
});

/**
 * A stream nobody is watching is not what this map is for. Upstream reports a
 * real zero rather than a missing value here — the count is absent for none of
 * them — and those rows are dominated by long-running loops and member-only
 * broadcasts that stay "live" for days. Dropping them removes agencies whose
 * only entry was such a stream, which is the intent: they are not live in any
 * sense a visitor cares about.
 */
const isWatched = (stream: UpstreamStream): boolean => stream.viewers > 0;

type Bucket = {
  name: string;
  streams: LiveStream[];
  totalViewers: number;
};

/**
 * Groups live streams into agencies and precomputes both response shapes.
 *
 * Pure: the same streams and timestamp always produce the same snapshot, so the
 * cron handler stays a thin wrapper around a function tests can drive directly.
 */
export const buildSnapshot = (
  streams: readonly UpstreamStream[],
  updatedAt: string
): Snapshot => {
  const buckets = new Map<string, Bucket>();

  for (const stream of streams.filter(isWatched)) {
    const name = stream.org ?? INDEPENDENT_AGENCY_NAME;
    const id =
      stream.org === null ? INDEPENDENT_AGENCY_ID : agencyIdFromName(name);
    const bucket = buckets.get(id) ?? { name, streams: [], totalViewers: 0 };
    bucket.streams.push(toLiveStream(stream));
    bucket.totalViewers += stream.viewers;
    buckets.set(id, bucket);
  }

  const agencies: AgencySummary[] = [];
  const streamsByAgency: Record<string, readonly LiveStream[]> = {};

  for (const [id, bucket] of buckets) {
    agencies.push({
      id,
      name: bucket.name,
      liveCount: bucket.streams.length,
      totalViewers: bucket.totalViewers,
    });
    // Viewer count decides what a visitor sees first in a grid that may hold
    // hundreds of independents.
    streamsByAgency[id] = bucket.streams.toSorted(
      (a, b) => b.viewers - a.viewers
    );
  }

  // Largest first, so a consumer that just takes the head gets the agencies that
  // matter. Where a tile physically lands is the treemap's decision, not this
  // ordering's — see `placementOrder` in live-map/treemapLayout.ts.
  return {
    updatedAt,
    agencies: agencies.toSorted(
      (a, b) => b.liveCount - a.liveCount || a.id.localeCompare(b.id)
    ),
    streamsByAgency,
  };
};
