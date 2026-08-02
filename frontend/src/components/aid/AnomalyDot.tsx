import { CHART_ALERT } from "@/theme";

/**
 * Recharts custom dot — normal: 3px blue + white stroke; anomalous: pulsing halo.
 * Requires transform-box: fill-box (aid.css) for SVG r animation about centre.
 */
export function AnomalyDot(props: {
  cx?: number;
  cy?: number;
  payload?: { anomaly?: boolean };
}) {
  const { cx = 0, cy = 0, payload } = props;
  const anomalous = !!payload?.anomaly;

  if (anomalous) {
    return (
      <g className="aid-anomaly-dot" aria-hidden>
        <circle
          className="aid-anomaly-dot__halo"
          cx={cx}
          cy={cy}
          r={7}
          fill="none"
          stroke={CHART_ALERT}
          strokeWidth={2}
          opacity={0.45}
        />
        <circle cx={cx} cy={cy} r={5} fill={CHART_ALERT} stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill="#14568c"
      stroke="#fff"
      strokeWidth={1.5}
      aria-hidden
    />
  );
}
