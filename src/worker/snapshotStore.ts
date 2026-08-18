import type { Snapshot } from "@/worker/snapshot";

const SNAPSHOT_KEY = "snapshot:v1";

/**
 * The persistence the Worker needs, stated in its own terms rather than as
 * "json at a key". Typed per operation, so the refresh logic runs against a
 * plain object in tests with no Workers runtime and no casting, and the key
 * string exists in exactly one place.
 */
export type SnapshotStore = {
  readonly readSnapshot: () => Promise<Snapshot | null>;
  readonly writeSnapshot: (snapshot: Snapshot) => Promise<void>;
};

export const kvSnapshotStore = (namespace: KVNamespace): SnapshotStore => ({
  readSnapshot: async () => namespace.get<Snapshot>(SNAPSHOT_KEY, "json"),
  writeSnapshot: async (snapshot) => {
    await namespace.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
  },
});
