import { describe, expect, test } from "vitest";
import { photoUrlForSize } from "@/live-map/channelPhoto";

const photo =
  "https://yt3.ggpht.com/ytc/AIdro_nb4Jgays=s800-c-k-c0x00ffffff-no-rj";

describe("photoUrlForSize", () => {
  test("requests the size the icon is drawn at", () => {
    expect(photoUrlForSize(photo, 112)).toBe(
      "https://yt3.ggpht.com/ytc/AIdro_nb4Jgays=s112-c-k-c0x00ffffff-no-rj"
    );
  });

  test("keeps the rest of the path intact", () => {
    expect(photoUrlForSize(photo, 112)).toContain("-c-k-c0x00ffffff-no-rj");
  });

  test("leaves a url without the size convention untouched", () => {
    const other = "https://example.test/avatar.png";

    expect(photoUrlForSize(other, 112)).toBe(other);
  });

  test("replaces only the size segment, not a similar-looking path", () => {
    expect(photoUrlForSize("https://x.test/s900/pic=s800-c", 112)).toBe(
      "https://x.test/s900/pic=s112-c"
    );
  });
});
