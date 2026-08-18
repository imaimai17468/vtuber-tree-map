import { z } from "zod";

/**
 * The contract between the Worker and the browser. The schemas are the single
 * definition: the Worker's response types are inferred from them, and the
 * browser parses against them, so a drift between the two is a parse error at
 * the boundary rather than an `undefined` deep inside a component.
 */

export const agencySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  liveCount: z.number(),
  totalViewers: z.number(),
});

export const liveStreamSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelId: z.string(),
  channelName: z.string(),
  channelPhoto: z.string().nullable(),
  viewers: z.number(),
  startedAt: z.string().nullable(),
});

/** Payload of `GET /api/agencies` — everything the treemap needs, and nothing else. */
export const agenciesResponseSchema = z.object({
  updatedAt: z.string(),
  agencies: z.array(agencySummarySchema).readonly(),
});

/** Payload of `GET /api/agencies/:id/streams` — fetched only when an agency opens. */
export const agencyStreamsResponseSchema = z.object({
  updatedAt: z.string(),
  agency: agencySummarySchema,
  streams: z.array(liveStreamSchema).readonly(),
});

export type AgencySummary = z.infer<typeof agencySummarySchema>;
export type LiveStream = z.infer<typeof liveStreamSchema>;
export type AgenciesResponse = z.infer<typeof agenciesResponseSchema>;
export type AgencyStreamsResponse = z.infer<typeof agencyStreamsResponseSchema>;

export const youtubeWatchUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${videoId}`;
