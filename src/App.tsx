import { useState, type ReactNode } from "react";
import "@/live-map/liveMap.css";
import { agenciesResponseSchema, type AgenciesResponse } from "@/api";
import { AgencyMapView } from "@/live-map/AgencyMapView";
import { AgencyStreamPanel } from "@/live-map/AgencyStreamPanel";
import { DataSourceCredit } from "@/live-map/DataSourceCredit";
import { usePolledJson } from "@/live-map/usePolledJson";

/**
 * Matches the Worker's cron period in `wrangler.toml`; polling faster only
 * returns the same snapshot, and each poll costs a KV read even when it answers
 * 304.
 */
const REFRESH_MS = 120_000;

/** Module scope so the identity is stable across renders — it is an effect dependency. */
const parseAgencies = (payload: unknown): AgenciesResponse =>
  agenciesResponseSchema.parse(payload);

/**
 * Holds the fetch and the one piece of navigation state, and picks the view.
 * Every branch below is a component that takes what it renders as props, so the
 * views are testable without a network.
 */
export function App() {
  const agencies = usePolledJson("/api/agencies", REFRESH_MS, parseAgencies);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

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

  // Reachable in the small hours: unwatched streams are filtered out before the
  // snapshot is built, so an empty list means nobody with an audience is on air.
  if (list.length === 0) {
    return <StatusPage>いま配信している人はいません。</StatusPage>;
  }

  // Derived, not synchronised: an agency leaves the list as soon as its last
  // watched stream ends, which happens between polls while its view is open.
  // Its detail view would have nothing left to show, so the map — the current
  // truth — is what to fall back to.
  const isSelectionLive = list.some((agency) => agency.id === selectedAgencyId);

  if (selectedAgencyId !== null && isSelectionLive) {
    return (
      <Page>
        <AgencyStreamPanel
          key={selectedAgencyId}
          agencyId={selectedAgencyId}
          refreshMs={REFRESH_MS}
          onBack={() => {
            setSelectedAgencyId(null);
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
        onSelectAgency={setSelectedAgencyId}
      />
    </Page>
  );
}

/**
 * The frame every view shares. The attribution is part of it rather than of each
 * view, because the Holodex terms require it wherever their material is exposed
 * and a view added later would otherwise ship without it.
 */
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
