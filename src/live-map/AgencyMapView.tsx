import type { AgencySummary } from "@/api";
import { AgencyTreemap } from "@/live-map/AgencyTreemap";
import { formatCount, formatUpdatedAt } from "@/live-map/format";
import { ViewerScaleLegend } from "@/live-map/ViewerScaleLegend";

type Props = {
  readonly agencies: readonly AgencySummary[];
  readonly updatedAt: string;
  readonly onSelectAgency: (agencyId: string) => void;
};

/**
 * Pure props -> JSX. The totals are derived here rather than passed in: they are
 * a function of `agencies` alone, so computing them anywhere else would let the
 * two disagree.
 */
export function AgencyMapView({ agencies, updatedAt, onSelectAgency }: Props) {
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
          {formatCount(totalViewers)} 人 ／ {formatUpdatedAt(updatedAt)} 時点
        </p>
      </header>

      <p className="page-hint">
        面積は配信中のライバー数、色の濃さは事務所の合計視聴者数です。視聴者が 0
        人の配信は除いています。
      </p>
      <ViewerScaleLegend />

      <AgencyTreemap agencies={agencies} onSelectAgency={onSelectAgency} />
    </>
  );
}
