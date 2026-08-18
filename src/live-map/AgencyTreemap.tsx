import { useCallback, useMemo, useState } from "react";
import type { AgencySummary } from "@/api";
import { formatCount } from "@/live-map/format";
import { layoutAgencies, type AgencyTile } from "@/live-map/treemapLayout";

/**
 * Below these a label would be clipped rather than shortened, so the tile shows
 * nothing and the hover card carries the values instead. The stats never appear
 * without the name above them: on a tall narrow sliver the name drops out on
 * width while the stats still clear the height, and a count with nobody's name
 * attached says nothing.
 */
const NAME_MIN_WIDTH = 68;
const NAME_MIN_HEIGHT = 34;
const STATS_MIN_HEIGHT = 62;

const fitsName = (tile: AgencyTile): boolean =>
  tile.width >= NAME_MIN_WIDTH && tile.height >= NAME_MIN_HEIGHT;

const fitsStats = (tile: AgencyTile): boolean =>
  fitsName(tile) && tile.height >= STATS_MIN_HEIGHT;

/** Kept in sync with `.treemap-tooltip`'s width so the clamp below can be exact. */
const TOOLTIP_WIDTH = 184;

type Size = { readonly width: number; readonly height: number };

type Props = {
  readonly agencies: readonly AgencySummary[];
  readonly onSelectAgency: (agencyId: string) => void;
};

export function AgencyTreemap({ agencies, onSelectAgency }: Props) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<AgencyTile | null>(null);

  // A callback ref that owns its observer and tears it down with the element
  // (React 19), rather than a mount effect that has to re-find the node.
  const measureRef = useCallback(
    (node: HTMLDivElement | null): (() => void) => {
      const observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect !== undefined) {
          setSize({ width: rect.width, height: rect.height });
        }
      });
      if (node !== null) {
        observer.observe(node);
      }
      return () => {
        observer.disconnect();
      };
    },
    []
  );

  const tiles = useMemo(
    () => layoutAgencies(agencies, size.width, size.height),
    [agencies, size.width, size.height]
  );

  return (
    <div className="treemap" ref={measureRef}>
      {tiles.map((tile) => (
        <button
          key={tile.agency.id}
          type="button"
          className="treemap-tile"
          style={{
            left: `${String(tile.x)}px`,
            top: `${String(tile.y)}px`,
            width: `${String(tile.width)}px`,
            height: `${String(tile.height)}px`,
            background: `var(--seq-${String(tile.viewerStep)})`,
            color: `var(--on-seq-${String(tile.viewerStep)})`,
          }}
          onClick={() => {
            onSelectAgency(tile.agency.id);
          }}
          onPointerEnter={() => {
            setHovered(tile);
          }}
          onPointerLeave={() => {
            setHovered(null);
          }}
          onFocus={() => {
            setHovered(tile);
          }}
          onBlur={() => {
            setHovered(null);
          }}
        >
          {fitsName(tile) ? (
            <span className="treemap-tile-name">{tile.agency.name}</span>
          ) : null}
          {fitsStats(tile) ? (
            <span className="treemap-tile-stats">
              {formatCount(tile.agency.liveCount)}人配信中 ／{" "}
              {formatCount(tile.agency.totalViewers)}人視聴
            </span>
          ) : null}
        </button>
      ))}

      {hovered === null ? null : (
        <div
          className="treemap-tooltip"
          style={{
            // Anchored to the hovered tile and clamped to the container, so a
            // tile on the right edge does not push the card out of view.
            left: `${String(Math.min(hovered.x, Math.max(size.width - TOOLTIP_WIDTH, 0)))}px`,
            top: `${String(hovered.y)}px`,
          }}
        >
          <strong>{hovered.agency.name}</strong>
          <span>配信中 {formatCount(hovered.agency.liveCount)} 人</span>
          <span>合計視聴者 {formatCount(hovered.agency.totalViewers)} 人</span>
        </div>
      )}
    </div>
  );
}
