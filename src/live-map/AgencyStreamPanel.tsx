import { agencyStreamsResponseSchema, type AgencyStreamsResponse } from "@/api";
import { AgencyStreamGrid } from "@/live-map/AgencyStreamGrid";
import { usePolledJson } from "@/live-map/usePolledJson";

/** Module scope so the identity is stable across renders — it is an effect dependency. */
const parseStreams = (payload: unknown): AgencyStreamsResponse =>
  agencyStreamsResponseSchema.parse(payload);

type Props = {
  readonly agencyId: string;
  readonly refreshMs: number;
  readonly onBack: () => void;
};

/**
 * Owns the per-agency request. Mount this with `key={agencyId}` so switching
 * agencies remounts instead of leaving the previous agency's streams on screen.
 */
export function AgencyStreamPanel({ agencyId, refreshMs, onBack }: Props) {
  const streams = usePolledJson(
    `/api/agencies/${encodeURIComponent(agencyId)}/streams`,
    refreshMs,
    parseStreams
  );

  if (streams.status === "loading") {
    return <p className="empty">読み込み中…</p>;
  }
  if (streams.status === "error") {
    return (
      <p className="empty">
        配信一覧を取得できませんでした（{streams.message}）
      </p>
    );
  }

  return (
    <AgencyStreamGrid
      agency={streams.data.agency}
      streams={streams.data.streams}
      onBack={onBack}
    />
  );
}
