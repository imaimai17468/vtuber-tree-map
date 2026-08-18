import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { INDEPENDENT_AGENCY_ID, type AgencySummary } from "@/api";

/** Matches the number of steps in the sequential ramp declared in index.css. */
export const VIEWER_STEP_COUNT = 5;

/** The surface gap the data-viz mark spec asks for between adjacent fills. */
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
 * An agency's viewers divided by the streamers drawing them. Independent of the
 * live count that area already encodes: measured on 2026-08-18, the total
 * correlates with the live count at r = 0.71 and this at r = 0.32, and the four
 * largest agencies all landed on one step under the total.
 */
export const viewersPerLiver = (agency: AgencySummary): number =>
  agency.liveCount === 0 ? 0 : agency.totalViewers / agency.liveCount;

/**
 * Bins a viewer figure onto the sequential ramp. Logarithmic because the busiest
 * agency out-draws the quietest by orders of magnitude.
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
          viewersPerLiver(agency),
          viewers.min,
          viewers.max
        ),
      },
    ];
  });
};

/**
 * Area is live count; independents take their share of it as a column on the
 * right, and the agencies squarify into what is left. Squarify sizes each tile
 * against the space still unclaimed, so one pass over the whole set flattens the
 * tiles that precede independents.
 */
export const layoutAgencies = (
  agencies: readonly AgencySummary[],
  width: number,
  height: number
): readonly AgencyTile[] => {
  if (agencies.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const perLiver = agencies.map(viewersPerLiver);
  const viewers: ViewerRange = {
    min: Math.min(...perLiver),
    max: Math.max(...perLiver),
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
  const usable = width - TILE_GAP;
  const independentsWidth = Math.round(
    (usable * independents.liveCount) / Math.max(total, 1)
  );
  const restWidth = usable - independentsWidth;

  return [
    ...squarifyInto(rest, { x: 0, y: 0, width: restWidth, height }, viewers),
    {
      agency: independents,
      x: restWidth + TILE_GAP,
      y: 0,
      width: independentsWidth,
      height,
      viewerStep: viewerStepFor(
        viewersPerLiver(independents),
        viewers.min,
        viewers.max
      ),
    },
  ];
};
