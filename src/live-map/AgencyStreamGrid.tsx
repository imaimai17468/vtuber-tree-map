import type { AgencySummary, LiveStream } from "@/api";
import { youtubeWatchUrl } from "@/api";
import { ChannelAvatar } from "@/live-map/ChannelAvatar";
import { formatCount } from "@/live-map/format";

type Props = {
  readonly agency: AgencySummary;
  readonly streams: readonly LiveStream[];
  readonly onBack: () => void;
};

/**
 * Pure props -> JSX: every state a test needs to reach is passed in, so the grid
 * never has to be driven through the panel that fetches for it.
 */
export function AgencyStreamGrid({ agency, streams, onBack }: Props) {
  return (
    <section className="agency">
      <header className="agency-header">
        <button type="button" className="agency-back" onClick={onBack}>
          ← 事務所一覧
        </button>
        <h2 className="agency-name">{agency.name}</h2>
        <p className="agency-stats">
          配信中 {formatCount(agency.liveCount)} 人 ／ 合計視聴者{" "}
          {formatCount(agency.totalViewers)} 人
        </p>
      </header>

      {streams.length === 0 ? (
        <p className="empty">いまこの事務所で配信している人はいません。</p>
      ) : (
        <ul className="stream-grid">
          {streams.map((stream) => (
            <li key={stream.videoId}>
              <a
                className="stream-card"
                href={youtubeWatchUrl(stream.videoId)}
                target="_blank"
                rel="noreferrer"
                title={stream.title}
              >
                <ChannelAvatar src={stream.channelPhoto} size={56} />
                <span className="stream-channel">{stream.channelName}</span>
                <span className="stream-viewers">
                  {formatCount(stream.viewers)} 人
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
