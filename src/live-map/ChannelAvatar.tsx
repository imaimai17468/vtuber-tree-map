import { useState } from "react";
import { photoUrlForSize } from "@/live-map/channelPhoto";

type Props = {
  /** Named after the native attribute it stands in for, per the component conventions. */
  readonly src: string | null;
  readonly size: number;
};

/**
 * The channel icon, with the failure case handled.
 *
 * Some of Holodex's photo URLs 404 or refuse the hotlink — 4 of 52 on
 * 2026-08-18 — and the browser's default for that is a broken-image glyph. The
 * load state is presentation-local, so it stays here.
 *
 * It records *which* url failed rather than a boolean, so a new `src` is not
 * judged by the previous one's failure. A boolean would need a `key` at every
 * call site to reset it.
 */
export function ChannelAvatar({ src, size }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src === null || failedSrc === src) {
    return (
      <span className="stream-avatar stream-avatar-blank" aria-hidden="true" />
    );
  }

  return (
    <img
      className="stream-avatar"
      // Twice the CSS size, so the icon stays sharp on a 2x display and costs
      // a fraction of what the upstream default would.
      src={photoUrlForSize(src, size * 2)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailedSrc(src);
      }}
    />
  );
}
