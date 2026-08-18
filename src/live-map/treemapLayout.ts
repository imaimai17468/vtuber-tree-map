import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import type { AgencySummary } from "@/api";

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

type TreeDatum = {
  readonly agency: AgencySummary | null;
  readonly children?: readonly TreeDatum[];
};

/**
 * Squarified treemap over the agencies: area is live count, per the spec.
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
  const minViewers = Math.min(...viewerTotals);
  const maxViewers = Math.max(...viewerTotals);

  const root = hierarchy<TreeDatum>(
    { agency: null, children: agencies.map((agency) => ({ agency })) },
    (datum) => datum.children
  ).sum((datum) => datum.agency?.liveCount ?? 0);

  const laidOut = treemap<TreeDatum>()
    .tile(treemapSquarify)
    .size([width, height])
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
        x: node.x0,
        y: node.y0,
        width: node.x1 - node.x0,
        height: node.y1 - node.y0,
        viewerStep: viewerStepFor(agency.totalViewers, minViewers, maxViewers),
      },
    ];
  });
};
