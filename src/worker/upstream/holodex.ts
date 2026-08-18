/**
 * Holodex API client.
 *
 * Notices required by the Holodex API terms (https://docs.holodex.net/, "Terms
 * of Service"), which oblige anyone giving public access to Holodex material to
 * identify Holodex, and to carry in the source a notice referring to the public
 * license those terms name and to its disclaimer of warranties:
 *
 * - The live data this project serves comes from Holodex (https://holodex.net).
 *   The running site states that on every view — see
 *   `live-map/DataSourceCredit.tsx`.
 * - Use of the Holodex API and of the material it returns is governed by the
 *   Holodex API terms and the public license they refer to, including the
 *   disclaimer of warranties in those terms: the material is provided as-is,
 *   with no warranty of any kind.
 *
 * This project is unofficial and is not affiliated with or endorsed by Holodex.
 */
import { z } from "zod";
import type { UpstreamClient, UpstreamStream } from "@/worker/upstream/types";

const HOLODEX_BASE = "https://holodex.net/api/v2";

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
    org: z.string().nullish(),
  }),
});

const liveResponseSchema = z.array(liveVideoSchema);

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
 * Holodex sends `english_name: ""` for channels it has no romanisation for, and
 * `??` would keep that empty string — a card with no name at all. Only a
 * non-blank value counts as a name.
 */
export const preferredName = (
  englishName: string | null | undefined,
  name: string
): string => {
  const english = englishName?.trim() ?? "";
  return english === "" ? name : english;
};

/**
 * Holodex names a lack of agency rather than leaving the field empty, and it does
 * so per platform — "Independents" and "Twitch Independents" both mean the channel
 * belongs to nobody. Matching the whole trailing word covers the next platform
 * Holodex adds without another edit here, while leaving an agency that merely
 * contains the word ("Independent Sounds") alone.
 *
 * Checked against all 110 org values in use on 2026-08-18: these were the only
 * non-agency labels, and every other value down to the one-channel entries named
 * a real organisation.
 */
const INDEPENDENT_ORG = /(?:^|\s)independents?$/u;

export const normalizeOrg = (org: string | null | undefined): string | null => {
  const trimmed = org?.trim() ?? "";
  return trimmed === "" || INDEPENDENT_ORG.test(trimmed.toLowerCase())
    ? null
    : trimmed;
};

/**
 * `/live` returns every live stream in one response — `limit=9999` and the
 * default gave the same rows, `offset=100` gave none — and the org on each
 * embedded channel agrees with the full `/channels` list, so neither needs
 * paginating or cross-checking.
 */
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
      channelName: preferredName(
        video.channel.english_name,
        video.channel.name
      ),
      channelPhoto: video.channel.photo ?? null,
      org: normalizeOrg(video.channel.org),
      viewers: video.live_viewers ?? 0,
      startedAt: video.start_actual ?? null,
    }));
  },
});
