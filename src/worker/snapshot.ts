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

/** Ids appear in URLs, so they must not shift as unrelated agencies come and go. */
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
 * Upstream reports a real zero here rather than a missing count, and those rows
 * are dominated by long-running loops and member-only broadcasts that stay
 * "live" for days.
 */
const isWatched = (stream: UpstreamStream): boolean => stream.viewers > 0;

type Bucket = {
  name: string;
  streams: LiveStream[];
  totalViewers: number;
};

/** Groups live streams into agencies and precomputes both response shapes. */
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
    // A grid of independents can hold hundreds; the busiest come first.
    streamsByAgency[id] = bucket.streams.toSorted(
      (a, b) => b.viewers - a.viewers
    );
  }

  // Largest first. Where a tile lands is the treemap's decision, not this order's.
  return {
    updatedAt,
    agencies: agencies.toSorted(
      (a, b) => b.liveCount - a.liveCount || a.id.localeCompare(b.id)
    ),
    streamsByAgency,
  };
};
