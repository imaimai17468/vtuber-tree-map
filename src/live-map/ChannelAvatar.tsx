import { useState } from "react";

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
      src={photoUrl}
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
