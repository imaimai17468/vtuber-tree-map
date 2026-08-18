import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { AgencySummary } from "@/api";
import { AgencyMapView } from "@/live-map/AgencyMapView";

const agency = (over: Partial<AgencySummary> = {}): AgencySummary => ({
  id: "hololive",
  name: "Hololive",
  liveCount: 5,
  totalViewers: 1_000,
  ...over,
});

const noop = vi.fn<(agencyId: string) => void>();

const UPDATED_AT = "2026-08-18T02:03:00.000Z";
/** One minute after the snapshot was stamped: the healthy case. */
const FETCHED_AT = Date.parse(UPDATED_AT) + 60_000;

describe("AgencyMapView", () => {
  test("sums the live counts across agencies", () => {
    render(
      <AgencyMapView
        agencies={[agency({ liveCount: 5 }), agency({ id: "b", liveCount: 7 })]}
        updatedAt={UPDATED_AT}
        fetchedAt={FETCHED_AT}
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText(/12 人配信中/u)).toBeInTheDocument();
  });

  test("sums the viewers across agencies", () => {
    render(
      <AgencyMapView
        agencies={[
          agency({ totalViewers: 1_000 }),
          agency({ id: "b", totalViewers: 2_500 }),
        ]}
        updatedAt={UPDATED_AT}
        fetchedAt={FETCHED_AT}
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText(/3,500 人/u)).toBeInTheDocument();
  });

  test("says how stale the snapshot was when it arrived", () => {
    render(
      <AgencyMapView
        agencies={[agency()]}
        updatedAt={UPDATED_AT}
        fetchedAt={FETCHED_AT}
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText(/1 分前/u)).toBeInTheDocument();
  });

  test("stays quiet about staleness while the cron is keeping up", () => {
    render(
      <AgencyMapView
        agencies={[agency()]}
        updatedAt={UPDATED_AT}
        fetchedAt={FETCHED_AT}
        onSelectAgency={noop}
      />
    );

    expect(screen.queryByText(/更新が滞っています/u)).toBeNull();
  });

  test("says so plainly once the snapshot has stopped being refreshed", () => {
    render(
      <AgencyMapView
        agencies={[agency()]}
        updatedAt={UPDATED_AT}
        fetchedAt={Date.parse(UPDATED_AT) + 40 * 60_000}
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText(/更新が滞っています/u)).toBeInTheDocument();
  });

  test("states which encoding the colour carries", () => {
    render(
      <AgencyMapView
        agencies={[agency()]}
        updatedAt={UPDATED_AT}
        fetchedAt={FETCHED_AT}
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText("1 人あたり視聴者")).toBeInTheDocument();
  });
});
