import type { AgencyTile } from "@/live-map/treemapLayout";

/**
 * Below these a label would be clipped rather than shortened, so the tile shows
 * nothing and the hover card carries the values instead. Tied to the font size
 * and padding in `liveMap.css` — move them together.
 */
const NAME_MIN_WIDTH = 68;
const NAME_MIN_HEIGHT = 34;
const STATS_MIN_HEIGHT = 62;

export const fitsName = (tile: AgencyTile): boolean =>
  tile.width >= NAME_MIN_WIDTH && tile.height >= NAME_MIN_HEIGHT;

/**
 * The stats never appear without the name above them. On a tall narrow sliver the
 * name drops out on width while the stats still clear the height, and a count
 * with nobody's name attached says nothing — that shipped once.
 */
export const fitsStats = (tile: AgencyTile): boolean =>
  fitsName(tile) && tile.height >= STATS_MIN_HEIGHT;
