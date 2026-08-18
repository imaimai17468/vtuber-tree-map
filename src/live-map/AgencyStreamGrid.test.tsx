import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { AgencySummary, LiveStream } from "@/api";
import { AgencyStreamGrid } from "@/live-map/AgencyStreamGrid";

const agency: AgencySummary = {
  id: "vspo",
  name: "ぶいすぽっ！",
  liveCount: 2,
  totalViewers: 3_000,
};

const stream = (over: Partial<LiveStream> = {}): LiveStream => ({
  videoId: "abc",
  title: "配信タイトル",
  channelId: "UC1",
  channelName: "メンバーA",
  channelPhoto: "https://example.test/a.jpg",
  viewers: 2_000,
  startedAt: null,
  ...over,
});

describe("AgencyStreamGrid", () => {
  test("links each stream to its YouTube watch page", () => {
    render(
      <AgencyStreamGrid
        agency={agency}
        streams={[stream()]}
        onBack={vi.fn<() => void>()}
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=abc"
    );
  });

  test("shows each stream's viewer count", () => {
    render(
      <AgencyStreamGrid
        agency={agency}
        streams={[stream()]}
        onBack={vi.fn<() => void>()}
      />
    );

    expect(screen.getByText("2,000 人")).toBeInTheDocument();
  });

  test("defers channel icons so a long grid does not fetch them all at once", () => {
    render(
      <AgencyStreamGrid
        agency={agency}
        streams={[stream()]}
        onBack={vi.fn<() => void>()}
      />
    );

    expect(screen.getByRole("presentation")).toHaveAttribute("loading", "lazy");
  });

  test("renders a placeholder for a channel with no icon", () => {
    render(
      <AgencyStreamGrid
        agency={agency}
        streams={[stream({ channelPhoto: null })]}
        onBack={vi.fn<() => void>()}
      />
    );

    expect(screen.queryByRole("presentation")).toBeNull();
  });

  test("says so when the agency has nobody live", () => {
    render(
      <AgencyStreamGrid
        agency={agency}
        streams={[]}
        onBack={vi.fn<() => void>()}
      />
    );

    expect(
      screen.getByText("いまこの事務所で配信している人はいません。")
    ).toBeInTheDocument();
  });
});
