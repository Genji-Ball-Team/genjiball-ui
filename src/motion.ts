/**
 * Whether a change should play its motion now (brand.md, Genji touch): not under
 * `prefers-reduced-motion`, and not while the page is in the background, where nobody sees it.
 */
export function motionAllowed(): boolean {
  if (document.visibilityState === "hidden") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** A duration token like `"0.6s"` or `"150ms"` in milliseconds. */
export function durationMs(token: string): number {
  const value = Number.parseFloat(token);
  return token.trim().endsWith("ms") ? value : value * 1000;
}
