const numberFormat = new Intl.NumberFormat("ja-JP");

export const formatCount = (value: number): string =>
  numberFormat.format(value);

export const formatUpdatedAt = (isoTimestamp: string): string => {
  const at = new Date(isoTimestamp);
  return Number.isNaN(at.getTime())
    ? "-"
    : at.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};

/**
 * How stale the snapshot was when it arrived. The cron writes every two minutes
 * and KV needs about one to replicate, so a healthy figure stays under three.
 */
export const snapshotAgeMs = (updatedAt: string, fetchedAt: number): number => {
  const stamped = Date.parse(updatedAt);
  return Number.isNaN(stamped) ? 0 : Math.max(fetchedAt - stamped, 0);
};

/** Past this the cron has missed several runs, not just drifted. */
export const STALE_AFTER_MS = 6 * 60 * 1000;

export const formatAge = (ageMs: number): string => {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) {
    return "1 分以内";
  }
  if (minutes < 60) {
    return `${String(minutes)} 分前`;
  }
  return `${String(Math.floor(minutes / 60))} 時間前`;
};
