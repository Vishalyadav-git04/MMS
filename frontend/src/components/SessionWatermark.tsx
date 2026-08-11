/**
 * On-screen session stamp — intentionally disabled.
 * Previously rendered a diagonal "IP · username · datetime" watermark across
 * every screen; removed per request so no session/identity text is overlaid
 * on the app. Kept as a no-op component so existing <SessionWatermark />
 * call sites don't need to change.
 */
export function SessionWatermark() {
  return null;
}
