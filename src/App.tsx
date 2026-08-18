import type { ReactNode } from "react";
import "@/live-map/liveMap.css";
import { agenciesResponseSchema } from "@/api";
import { selectAgency, useSelectedAgencyId } from "@/live-map/agencyRoute";
import { AgencyMapView } from "@/live-map/AgencyMapView";
import { AgencyStreamPanel } from "@/live-map/AgencyStreamPanel";
import { DataSourceCredit } from "@/live-map/DataSourceCredit";
import { usePolledJson } from "@/live-map/usePolledJson";

/** The Worker's cron period in `wrangler.toml`. Polling faster refetches the same snapshot. */
const REFRESH_MS = 120_000;

export function App() {
  const agencies = usePolledJson(
    "/api/agencies",
    REFRESH_MS,
    agenciesResponseSchema
  );
  const selectedAgencyId = useSelectedAgencyId();

  if (agencies.status === "loading") {
    return <StatusPage>読み込み中…</StatusPage>;
  }
  if (agencies.status === "error") {
    return (
      <StatusPage>
        いま配信状況を取得できません（{agencies.message}）
      </StatusPage>
    );
  }

  const { updatedAt, agencies: list } = agencies.data;

  // Reachable in the small hours: unwatched streams never reach the snapshot.
  if (list.length === 0) {
    return <StatusPage>いま配信している人はいません。</StatusPage>;
  }

  // An agency leaves the list when its last watched stream ends, which happens
  // between polls while its own view is open.
  const isSelectionLive = list.some((agency) => agency.id === selectedAgencyId);

  if (selectedAgencyId !== null && isSelectionLive) {
    return (
      <Page>
        <AgencyStreamPanel
          key={selectedAgencyId}
          agencyId={selectedAgencyId}
          refreshMs={REFRESH_MS}
          onBack={() => {
            selectAgency(null);
          }}
        />
      </Page>
    );
  }

  return (
    <Page>
      <AgencyMapView
        agencies={list}
        updatedAt={updatedAt}
        fetchedAt={agencies.fetchedAt}
        onSelectAgency={selectAgency}
      />
    </Page>
  );
}

/** The frame every view shares, attribution included. */
function Page({ children }: { readonly children: ReactNode }) {
  return (
    <main className="page">
      {children}
      <DataSourceCredit />
    </main>
  );
}

/** The frame with a title and a single line of text: loading, error, nobody live. */
function StatusPage({ children }: { readonly children: ReactNode }) {
  return (
    <Page>
      <header className="page-header">
        <h1 className="page-title">VTuber Tree Map</h1>
      </header>
      <p className="empty">{children}</p>
    </Page>
  );
}
