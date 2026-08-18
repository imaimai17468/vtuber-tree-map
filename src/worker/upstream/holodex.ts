import { z } from "zod";
import type { UpstreamClient, UpstreamStream } from "@/worker/upstream/types";

const HOLODEX_BASE = "https://holodex.net/api/v2";

/** `/channels` caps a page at 50; anything larger is silently truncated upstream. */
const CHANNEL_PAGE_SIZE = 50;

/**
 * Stops pagination from following a misbehaving upstream forever. Holodex tracks
 * a few thousand vtuber channels, so this leaves ample headroom while keeping a
 * single cron run bounded.
 */
const MAX_CHANNEL_PAGES = 200;

const liveVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  live_viewers: z.number().nullish(),
  start_actual: z.string().nullish(),
  channel: z.object({
    id: z.string(),
    name: z.string(),
    english_name: z.string().nullish(),
    photo: z.string().nullish(),
    // Present on the full channel resource. The minimal channel embedded in a
    // video may omit it, which is why `fetchChannelOrgs` exists — this is the
    // fast path, not the only one.
    org: z.string().nullish(),
  }),
});

const channelSchema = z.object({
  id: z.string(),
  org: z.string().nullish(),
});

const liveResponseSchema = z.array(liveVideoSchema);
const channelsResponseSchema = z.array(channelSchema);

export class HolodexError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "HolodexError";
  }
}

const request = async (
  apiKey: string,
  path: string,
  params: Readonly<Record<string, string>>
): Promise<unknown> => {
  const url = new URL(`${HOLODEX_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { "X-APIKEY": apiKey, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new HolodexError(
      `Holodex ${path} responded ${String(response.status)}`,
      response.status
    );
  }

  return response.json();
};

/**
 * Holodex reports an independent's org as absent, or as one of the catch-all
 * labels it uses for un-affiliated channels. Both mean "no agency" to us, and
 * collapsing them here keeps that judgment out of the aggregation.
 */
const INDEPENDENT_ORG_LABELS = new Set(["independents", "independent", ""]);

export const normalizeOrg = (org: string | null | undefined): string | null => {
  const trimmed = org?.trim() ?? "";
  return INDEPENDENT_ORG_LABELS.has(trimmed.toLowerCase()) ? null : trimmed;
};

/**
 * Walks `/channels` until a short page proves the list is exhausted. Expressed
 * as recursion rather than a loop because each request's offset is only known
 * once the previous page has come back — there is nothing to parallelize.
 */
const collectChannelOrgs = async (
  apiKey: string,
  page: number,
  orgs: Map<string, string>
): Promise<ReadonlyMap<string, string>> => {
  if (page >= MAX_CHANNEL_PAGES) {
    return orgs;
  }

  const payload = await request(apiKey, "/channels", {
    type: "vtuber",
    limit: String(CHANNEL_PAGE_SIZE),
    offset: String(page * CHANNEL_PAGE_SIZE),
  });
  const channels = channelsResponseSchema.parse(payload);

  for (const channel of channels) {
    const org = normalizeOrg(channel.org);
    if (org !== null) {
      orgs.set(channel.id, org);
    }
  }

  return channels.length < CHANNEL_PAGE_SIZE
    ? orgs
    : collectChannelOrgs(apiKey, page + 1, orgs);
};

export const createHolodexClient = (apiKey: string): UpstreamClient => ({
  fetchLiveStreams: async () => {
    const payload = await request(apiKey, "/live", {
      status: "live",
      type: "stream",
    });

    return liveResponseSchema.parse(payload).map((video): UpstreamStream => ({
      videoId: video.id,
      title: video.title,
      channelId: video.channel.id,
      channelName: video.channel.english_name ?? video.channel.name,
      channelPhoto: video.channel.photo ?? null,
      org: normalizeOrg(video.channel.org),
      viewers: video.live_viewers ?? 0,
      startedAt: video.start_actual ?? null,
    }));
  },

  fetchChannelOrgs: async () => collectChannelOrgs(apiKey, 0, new Map()),
});

/**
 * Fills in the agency for streams whose embedded channel did not carry one.
 * A channel absent from the map is an independent, which is also the state the
 * map itself encodes by omitting it.
 */
export const withChannelOrgs = (
  streams: readonly UpstreamStream[],
  orgs: ReadonlyMap<string, string>
): readonly UpstreamStream[] =>
  streams.map((stream) =>
    stream.org === null
      ? { ...stream, org: orgs.get(stream.channelId) ?? null }
      : stream
  );
