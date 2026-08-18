import type { AgencyTile } from "@/live-map/treemapLayout";

// Taken from `.treemap-tile` and its label rules in liveMap.css.
const TILE_PADDING = 8;
const TILE_GAP = 2;
const NAME_LINE = 16; // 13px at line-height 1.2, rounded up
const STATS_LINE = 15; // 11px at line-height 1.3, rounded up
const STATS_LINES = 2; // the stats wrap onto a second line on a narrow tile

const NAME_MIN_HEIGHT = TILE_PADDING * 2 + NAME_LINE;
const STATS_MIN_HEIGHT = NAME_MIN_HEIGHT + TILE_GAP + STATS_LINE * STATS_LINES;

/** Narrower than this and the ellipsis leaves nothing of the name. Measured, not derived. */
const NAME_MIN_WIDTH = 68;

export const fitsName = (tile: AgencyTile): boolean =>
  tile.width >= NAME_MIN_WIDTH && tile.height >= NAME_MIN_HEIGHT;

export const fitsStats = (tile: AgencyTile): boolean =>
  fitsName(tile) && tile.height >= STATS_MIN_HEIGHT;
