import type { AgencySummary } from "@/api";
import { AgencyTreemap } from "@/live-map/AgencyTreemap";
import {
  formatAge,
  formatCount,
  formatUpdatedAt,
  snapshotAgeMs,
  STALE_AFTER_MS,
} from "@/live-map/format";
import { ViewerScaleLegend } from "@/live-map/ViewerScaleLegend";

type Props = {
  readonly agencies: readonly AgencySummary[];
  readonly updatedAt: string;
  readonly fetchedAt: number;
  readonly onSelectAgency: (agencyId: string) => void;
};

export function AgencyMapView({
  agencies,
  updatedAt,
  fetchedAt,
  onSelectAgency,
}: Props) {
  const ageMs = snapshotAgeMs(updatedAt, fetchedAt);
  const totalLive = agencies.reduce((sum, agency) => sum + agency.liveCount, 0);
  const totalViewers = agencies.reduce(
    (sum, agency) => sum + agency.totalViewers,
    0
  );

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">VTuber Tree Map</h1>
        <p className="page-stats">
          {formatCount(totalLive)} 人配信中 ／ 合計視聴者{" "}
          {formatCount(totalViewers)} 人 ／ {formatUpdatedAt(updatedAt)} 時点（
          {formatAge(ageMs)}）
        </p>
        {ageMs >= STALE_AFTER_MS ? (
          <p className="page-stale">
            更新が滞っています。表示は {formatAge(ageMs)}の状態です。
          </p>
        ) : null}
      </header>

      <p className="page-hint">
        面積は配信中のライバー数、濃さは 1 人あたりの視聴者数。視聴者 0
        人の配信は除外。
      </p>
      <ViewerScaleLegend />

      <AgencyTreemap agencies={agencies} onSelectAgency={onSelectAgency} />
    </>
  );
}
