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

describe("AgencyMapView", () => {
  test("sums the live counts across agencies", () => {
    render(
      <AgencyMapView
        agencies={[agency({ liveCount: 5 }), agency({ id: "b", liveCount: 7 })]}
        updatedAt="2026-08-18T02:03:00.000Z"
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
        updatedAt="2026-08-18T02:03:00.000Z"
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText(/3,500 人/u)).toBeInTheDocument();
  });

  test("states which encoding the colour carries", () => {
    render(
      <AgencyMapView
        agencies={[agency()]}
        updatedAt="2026-08-18T02:03:00.000Z"
        onSelectAgency={noop}
      />
    );

    expect(screen.getByText("合計視聴者数")).toBeInTheDocument();
  });
});
