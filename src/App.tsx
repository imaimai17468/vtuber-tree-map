import { useState, type ReactNode } from "react";
import "@/live-map/liveMap.css";
import { agenciesResponseSchema, type AgenciesResponse } from "@/api";
import { AgencyStreamPanel } from "@/live-map/AgencyStreamPanel";
import { AgencyTreemap } from "@/live-map/AgencyTreemap";
import { DataSourceCredit } from "@/live-map/DataSourceCredit";
import { formatCount, formatUpdatedAt } from "@/live-map/format";
import { usePolledJson } from "@/live-map/usePolledJson";
import { ViewerScaleLegend } from "@/live-map/ViewerScaleLegend";

/**
 * Matches the Worker's cron period in `wrangler.toml`; polling faster only
 * returns the same snapshot, and each poll costs a KV read even when it answers
 * 304.
 */
const REFRESH_MS = 120_000;

/** Module scope so the identity is stable across renders — it is an effect dependency. */
const parseAgencies = (payload: unknown): AgenciesResponse =>
  agenciesResponseSchema.parse(payload);

export function App() {
  const agencies = usePolledJson("/api/agencies", REFRESH_MS, parseAgencies);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  if (agencies.status === "loading") {
    return <Shell>読み込み中…</Shell>;
  }
  if (agencies.status === "error") {
    return <Shell>いま配信状況を取得できません（{agencies.message}）</Shell>;
  }

  const { updatedAt, agencies: list } = agencies.data;

  // Reachable in the small hours: unwatched streams are filtered out upstream of
  // this, so an empty list means nobody with an audience is on air.
  if (list.length === 0) {
    return <Shell>いま配信している人はいません。</Shell>;
  }

  const totalLive = list.reduce((sum, agency) => sum + agency.liveCount, 0);
  const totalViewers = list.reduce(
    (sum, agency) => sum + agency.totalViewers,
    0
  );

  if (selectedAgencyId !== null) {
    return (
      <main className="page">
        <AgencyStreamPanel
          key={selectedAgencyId}
          agencyId={selectedAgencyId}
          refreshMs={REFRESH_MS}
          onBack={() => {
            setSelectedAgencyId(null);
          }}
        />
        <DataSourceCredit />
      </main>
    );
  }

  return (
    <main className="page">
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

      <AgencyTreemap agencies={list} onSelectAgency={setSelectedAgencyId} />
      <DataSourceCredit />
    </main>
  );
}

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">VTuber Tree Map</h1>
      </header>
      <p className="empty">{children}</p>
      <DataSourceCredit />
    </main>
  );
}
