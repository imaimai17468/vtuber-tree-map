import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { INDEPENDENT_AGENCY_ID, type AgencySummary } from "@/api";

/** Matches the number of steps in the sequential ramp declared in index.css. */
export const VIEWER_STEP_COUNT = 5;

/** The 2px surface gap the data-viz mark spec asks for between adjacent fills. */
const TILE_GAP = 2;

export type AgencyTile = {
  readonly agency: AgencySummary;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 1-based index into the sequential ramp. */
  readonly viewerStep: number;
};

/**
 * Bins a viewer total onto the sequential ramp.
 *
 * Logarithmic because the distribution is extreme — the largest agency out-draws
 * the smallest by orders of magnitude, and a linear bin would collapse every
 * agency but one into a single step. Normalised against the observed *range*
 * rather than against the maximum alone: dividing by the maximum leaves the
 * ratios bunched near 1 (every agency within an order of magnitude of the leader
 * lands on the darkest step or the one below), which wastes most of the ramp.
 */
export const viewerStepFor = (
  totalViewers: number,
  minViewers: number,
  maxViewers: number
): number => {
  const low = Math.log1p(Math.max(minViewers, 0));
  const high = Math.log1p(Math.max(maxViewers, 0));
  if (high <= low) {
    return 1;
  }
  const ratio = (Math.log1p(Math.max(totalViewers, 0)) - low) / (high - low);
  const step = Math.ceil(ratio * VIEWER_STEP_COUNT);
  return Math.min(Math.max(step, 1), VIEWER_STEP_COUNT);
};

/** The 2px surface gap the data-viz mark spec asks for, applied between the two regions too. */
const REGION_GAP = TILE_GAP;

type TreeDatum = {
  readonly agency: AgencySummary | null;
  readonly children?: readonly TreeDatum[];
};

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type ViewerRange = {
  readonly min: number;
  readonly max: number;
};

const totalLiveCount = (agencies: readonly AgencySummary[]): number =>
  agencies.reduce((sum, agency) => sum + agency.liveCount, 0);

/** Squarified treemap of `agencies` into `box`, largest first. */
const squarifyInto = (
  agencies: readonly AgencySummary[],
  box: Box,
  viewers: ViewerRange
): readonly AgencyTile[] => {
  if (agencies.length === 0 || box.width <= 0 || box.height <= 0) {
    return [];
  }

  const bySize = agencies.toSorted(
    (a, b) => b.liveCount - a.liveCount || a.id.localeCompare(b.id)
  );

  const root = hierarchy<TreeDatum>(
    { agency: null, children: bySize.map((agency) => ({ agency })) },
    (datum) => datum.children
  ).sum((datum) => datum.agency?.liveCount ?? 0);

  const laidOut = treemap<TreeDatum>()
    .tile(treemapSquarify)
    .size([box.width, box.height])
    .paddingInner(TILE_GAP)
    .round(true)(root);

  return (laidOut.children ?? []).flatMap((node) => {
    const agency = node.data.agency;
    if (agency === null) {
      return [];
    }
    return [
      {
        agency,
        x: box.x + node.x0,
        y: box.y + node.y0,
        width: node.x1 - node.x0,
        height: node.y1 - node.y0,
        viewerStep: viewerStepFor(
          agency.totalViewers,
          viewers.min,
          viewers.max
        ),
      },
    ];
  });
};

/**
 * Area is live count, per the spec, and independents are held out as the
 * catch-all on the right.
 *
 * The two regions are laid out separately rather than by ordering one squarify
 * pass. Squarify places tiles in the order it is handed and sizes each against
 * the space still unclaimed, so a value as large as independents arriving last
 * leaves the one-streamer agencies before it packed into the full height of a
 * region they occupy almost none of — VRAID and YUMENOS came out as slivers a
 * few pixels wide. Giving independents its own column first leaves the rest a
 * clean descending sequence, which is the case squarify is good at.
 *
 * The split is by area, so the encoding is unchanged: the column takes exactly
 * its share of live streamers, and the agencies divide exactly the rest.
 *
 * Pure — same agencies and same box always give the same tiles — so the component
 * can hold it in `useMemo` and tests can assert on it without rendering.
 */
export const layoutAgencies = (
  agencies: readonly AgencySummary[],
  width: number,
  height: number
): readonly AgencyTile[] => {
  if (agencies.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const viewerTotals = agencies.map((agency) => agency.totalViewers);
  const viewers: ViewerRange = {
    min: Math.min(...viewerTotals),
    max: Math.max(...viewerTotals),
  };

  const independents = agencies.find(
    (agency) => agency.id === INDEPENDENT_AGENCY_ID
  );
  const rest = agencies.filter((agency) => agency.id !== INDEPENDENT_AGENCY_ID);

  if (independents === undefined) {
    return squarifyInto(agencies, { x: 0, y: 0, width, height }, viewers);
  }
  if (rest.length === 0) {
    return squarifyInto(agencies, { x: 0, y: 0, width, height }, viewers);
  }

  const total = totalLiveCount(agencies);
  const usable = width - REGION_GAP;
  const independentsWidth = Math.round(
    (usable * independents.liveCount) / Math.max(total, 1)
  );
  const restWidth = usable - independentsWidth;

  return [
    ...squarifyInto(rest, { x: 0, y: 0, width: restWidth, height }, viewers),
    {
      agency: independents,
      x: restWidth + REGION_GAP,
      y: 0,
      width: independentsWidth,
      height,
      viewerStep: viewerStepFor(
        independents.totalViewers,
        viewers.min,
        viewers.max
      ),
    },
  ];
};
