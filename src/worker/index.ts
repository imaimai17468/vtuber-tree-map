import type { AgenciesResponse, AgencyStreamsResponse } from "@/api";
import { buildSnapshot, type Snapshot } from "@/worker/snapshot";
import {
  createHolodexClient,
  withChannelOrgs,
} from "@/worker/upstream/holodex";

const SNAPSHOT_KEY = "snapshot:v1";
const CHANNEL_ORGS_KEY = "channel-orgs:v1";

/**
 * Agency membership changes on the order of days, and walking the channel list
 * costs dozens of upstream requests, so it is refreshed far more rarely than the
 * live data it annotates.
 */
const CHANNEL_ORGS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Long enough that most polls are answered by an edge or a 304, short enough
 * that a visitor never sees a snapshot two cron runs old.
 */
const CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=60";

type CachedChannelOrgs = {
  readonly fetchedAt: number;
  readonly entries: readonly (readonly [string, string])[];
};

const json = (body: unknown, init: ResponseInit = {}): Response => {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
};

/**
 * The snapshot is replaced wholesale once per cron run, so its timestamp
 * identifies the payload exactly — no hashing needed.
 */
const etagFor = (snapshot: Snapshot): string => `W/"${snapshot.updatedAt}"`;

const cached = (
  request: Request,
  snapshot: Snapshot,
  body: unknown
): Response => {
  const etag = etagFor(snapshot);
  const headers = { "Cache-Control": CACHE_CONTROL, ETag: etag };

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return json(body, { headers });
};

const readSnapshot = async (env: CloudflareEnv): Promise<Snapshot | null> =>
  env.SNAPSHOT.get<Snapshot>(SNAPSHOT_KEY, "json");

const readChannelOrgs = async (
  env: CloudflareEnv
): Promise<CachedChannelOrgs | null> =>
  env.SNAPSHOT.get<CachedChannelOrgs>(CHANNEL_ORGS_KEY, "json");

/**
 * Refreshes the live snapshot from upstream. Writes only on success, so a
 * failing upstream leaves the last good snapshot serving rather than blanking
 * the map.
 */
export const refreshSnapshot = async (
  env: CloudflareEnv,
  now: number
): Promise<void> => {
  const client = createHolodexClient(env.HOLODEX_API_KEY);

  const previous = await readChannelOrgs(env);
  const isStale =
    previous === null || now - previous.fetchedAt > CHANNEL_ORGS_TTL_MS;

  let orgs: ReadonlyMap<string, string>;
  if (isStale) {
    orgs = await client.fetchChannelOrgs();
    await env.SNAPSHOT.put(
      CHANNEL_ORGS_KEY,
      JSON.stringify({
        fetchedAt: now,
        entries: [...orgs],
      } satisfies CachedChannelOrgs)
    );
  } else {
    orgs = new Map(previous.entries);
  }

  const streams = await client.fetchLiveStreams();
  const snapshot = buildSnapshot(
    withChannelOrgs(streams, orgs),
    new Date(now).toISOString()
  );

  await env.SNAPSHOT.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
};

const handleApi = async (
  request: Request,
  env: CloudflareEnv,
  pathname: string
): Promise<Response> => {
  const snapshot = await readSnapshot(env);
  if (snapshot === null) {
    return json(
      { error: "snapshot_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (pathname === "/api/agencies") {
    const body: AgenciesResponse = {
      updatedAt: snapshot.updatedAt,
      agencies: snapshot.agencies,
    };
    return cached(request, snapshot, body);
  }

  const streamsMatch = /^\/api\/agencies\/([^/]+)\/streams$/u.exec(pathname);
  if (streamsMatch !== null) {
    const id = decodeURIComponent(streamsMatch[1] ?? "");
    const agency = snapshot.agencies.find((candidate) => candidate.id === id);
    if (agency === undefined) {
      return json({ error: "agency_not_found" }, { status: 404 });
    }

    const body: AgencyStreamsResponse = {
      updatedAt: snapshot.updatedAt,
      agency,
      streams: snapshot.streamsByAgency[id] ?? [],
    };
    return cached(request, snapshot, body);
  }

  return json({ error: "not_found" }, { status: 404 });
};

export default {
  fetch: async (request, env) => {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/api/")) {
      return handleApi(request, env, pathname);
    }
    return env.ASSETS.fetch(request);
  },

  scheduled: (_controller, env, ctx) => {
    // Handed to waitUntil so a slow upstream cannot make the cron invocation
    // itself time out mid-write.
    ctx.waitUntil(refreshSnapshot(env, Date.now()));
  },
} satisfies ExportedHandler<CloudflareEnv>;
