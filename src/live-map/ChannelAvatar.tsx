import { useState } from "react";
import { photoUrlForSize } from "@/live-map/channelPhoto";

type Props = {
  readonly photoUrl: string | null;
  readonly size: number;
};

/**
 * The channel icon, with the failure case handled.
 *
 * A quarter of Holodex's photo URLs 404 or refuse the hotlink, and the browser's
 * default for that is a broken-image glyph. The load state is presentation-local
 * — nothing outside this component branches on it — so it stays here.
 */
export function ChannelAvatar({ photoUrl, size }: Props) {
  const [failed, setFailed] = useState(false);

  if (photoUrl === null || failed) {
    return (
      <span className="stream-avatar stream-avatar-blank" aria-hidden="true" />
    );
  }

  return (
    <img
      className="stream-avatar"
      // Twice the CSS size, so the icon stays sharp on a 2x display and costs
      // a fraction of what the upstream default would.
      src={photoUrlForSize(photoUrl, size * 2)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
