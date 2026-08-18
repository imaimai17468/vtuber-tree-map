import type { AgenciesResponse, AgencyStreamsResponse } from "@/api";
import { buildSnapshot, type Snapshot } from "@/worker/snapshot";
import { kvSnapshotStore, type SnapshotStore } from "@/worker/snapshotStore";
import { createHolodexClient } from "@/worker/upstream/holodex";
import type { UpstreamClient } from "@/worker/upstream/types";

/**
 * Held under the cron period, so a cached response is never as old as the next
 * snapshot, while a visitor moving between views inside a minute is served
 * without reaching this Worker at all — reads count against a KV quota too.
 */
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=120";

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

/**
 * Refreshes the live snapshot from upstream. Writes only on success, so a
 * failing upstream leaves the last good snapshot serving rather than blanking
 * the map.
 */
export const refreshSnapshot = async (
  store: SnapshotStore,
  client: UpstreamClient,
  now: number
): Promise<void> => {
  const streams = await client.fetchLiveStreams();

  await store.writeSnapshot(
    buildSnapshot(streams, new Date(now).toISOString())
  );
};

const handleApi = async (
  request: Request,
  env: CloudflareEnv,
  pathname: string
): Promise<Response> => {
  const snapshot = await kvSnapshotStore(env.SNAPSHOT).readSnapshot();
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
    ctx.waitUntil(
      refreshSnapshot(
        kvSnapshotStore(env.SNAPSHOT),
        createHolodexClient(env.HOLODEX_API_KEY),
        Date.now()
      )
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
