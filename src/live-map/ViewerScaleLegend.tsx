import { VIEWER_STEP_COUNT } from "@/live-map/treemapLayout";

const steps = Array.from(
  { length: VIEWER_STEP_COUNT },
  (_, index) => index + 1
);

/**
 * The sequential ramp's key. Area already carries live count and is labelled on
 * the tiles, so the only encoding that needs explaining is the colour.
 */
export function ViewerScaleLegend() {
  return (
    <div className="legend">
      <span className="legend-label">1 人あたり視聴者</span>
      <span className="legend-end">少</span>
      <span className="legend-ramp">
        {steps.map((step) => (
          <span
            key={step}
            className="legend-step"
            style={{ background: `var(--seq-${String(step)})` }}
          />
        ))}
      </span>
      <span className="legend-end">多</span>
    </div>
  );
}
