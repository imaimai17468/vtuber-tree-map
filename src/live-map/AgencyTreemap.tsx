import { useCallback, useMemo, useState } from "react";
import type { AgencySummary } from "@/api";
import { formatCount } from "@/live-map/format";
import { fitsName, fitsStats } from "@/live-map/tileLabel";
import { layoutAgencies } from "@/live-map/treemapLayout";

const TOOLTIP_WIDTH = 184;

type Size = { readonly width: number; readonly height: number };

type Props = {
  readonly agencies: readonly AgencySummary[];
  readonly onSelectAgency: (agencyId: string) => void;
};

export function AgencyTreemap({ agencies, onSelectAgency }: Props) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [hoveredAgencyId, setHoveredAgencyId] = useState<string | null>(null);

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

  const hovered =
    tiles.find((tile) => tile.agency.id === hoveredAgencyId) ?? null;

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
            setHoveredAgencyId(tile.agency.id);
          }}
          onPointerLeave={() => {
            setHoveredAgencyId(null);
          }}
          onFocus={() => {
            setHoveredAgencyId(tile.agency.id);
          }}
          onBlur={() => {
            setHoveredAgencyId(null);
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
            width: `${String(TOOLTIP_WIDTH)}px`,
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
