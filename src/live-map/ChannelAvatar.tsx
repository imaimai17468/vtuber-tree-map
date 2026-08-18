import { useState } from "react";
import { photoUrlForSize } from "@/live-map/channelPhoto";

type Props = {
  readonly src: string | null;
  readonly size: number;
};

/**
 * Some of Holodex's photo URLs 404 or refuse the hotlink — 4 of 52 on
 * 2026-08-18 — and the browser draws a broken-image glyph for those.
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
