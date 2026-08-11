/**
 * MISO / MMS design tokens — mirrored in styles.css (:root) and mms.css (.mms-root).
 * Keep hex values in sync when changing brand colours.
 *
 * Note: this app uses Tailwind + shadcn/Radix, not Ant Design. The palette below is the
 * source of truth; CSS custom properties consume these values for components.
 */

export const FONT_UI =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const FONT_MONO =
  'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Consolas, monospace';

export const FONT_DISPLAY =
  '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

/** Design-system palette (Register A + shared with glass accents). */
export const palette = {
  /** Page background — icy blue paper (CSS canvas; more saturated than antd colourBgBase). */
  canvas: "#dfeaf6",
  /** Cards, panels, inputs — pure white so cards lift off the canvas. */
  surface: "#ffffff",
  /** Panel headers/footers, table headers, row hover. */
  surfaceAlt: "#eff5fb",
  /** Primary 1px borders. */
  line: "#cddcec",
  /** Internal dividers. */
  lineSoft: "#dfe9f4",

  /** Primary — deep azure, 7.0:1 on white. */
  accent: "#14568c",
  accentHi: "#1d74b8",
  accentSoft: "#e8f2fa",
  /** Energy colour: glows, focus rings, sweeps. */
  cyan: "#2ea8d5",
  /** Secondary national accent — 4.5:1+ on white. */
  saffron: "#a85711",
  saffronSoft: "#fbf0e4",

  danger: "#B3261E",
  alert: "#d32020",
  warning: "#8A5A00",
  /** Semantic green — not brand. */
  success: "#1F7A4D",

  ink: "#15202b",
  inkSoft: "#54606c",
  /** Holds 4.5:1 on tinted blue surfaces. */
  inkFaint: "#616d79",
  /** Form field label / placeholder / table-header colour — "icy blue" (= accentHi). */
  label: "#1d74b8",
} as const;

/** Six blues for charts — anomaly red is the only non-blue categorical colour. */
export const CHART_BLUES = [
  "#14568c",
  "#1d74b8",
  "#2ea8d5",
  "#5cc0e0",
  "#8ed3ea",
  "#b6e2f2",
] as const;

export const CHART_ALERT = "#d32020";

export const shadows = {
  sm: "0 1px 2px rgba(21,32,43,.05)",
  md: "0 2px 4px rgba(21,32,43,.04), 0 8px 24px rgba(21,32,43,.07)",
  lg: "0 4px 8px rgba(21,32,43,.05), 0 18px 44px rgba(21,32,43,.10)",
  glass: "0 8px 32px rgba(20,86,140,.12), 0 2px 8px rgba(20,86,140,.06)",
  glassHi: "0 12px 44px rgba(20,86,140,.20), 0 0 0 1px rgba(46,168,213,.35)",
} as const;

export const ease = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  rise: "cubic-bezier(0.22, 0.68, 0.32, 1)",
} as const;
