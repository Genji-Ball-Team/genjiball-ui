import { defineElement } from "./define.js";

/** How long a skeleton waits before it shows, so a fast load never flashes grey. */
export const skeletonDelayMs = 300;

// All CSS, no timers: the shape is hidden for the delay, then shows. A line pulses slowly and
// faintly; a block holds lines and stays still. A line in a block takes the block's `--border` fill,
// so it shows on the block's `raised`. Under reduced motion nothing pulses, but the delay stays.
const styles = `:host {
  display: block; block-size: 9px; border-radius: var(--r-chip); background: var(--gb-skeleton-fill, var(--raised));
  animation: appear 0s ${skeletonDelayMs}ms both, pulse 1.8s ease-in-out ${skeletonDelayMs}ms infinite;
}
:host([block]) {
  block-size: auto; min-block-size: 30px; border-radius: var(--r); background: var(--raised);
  --gb-skeleton-fill: var(--border); animation: appear 0s ${skeletonDelayMs}ms both;
}
:host([hidden]) { display: none; }
@keyframes appear { from { visibility: hidden; } to { visibility: visible; } }
@keyframes pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { :host { animation: appear 0s ${skeletonDelayMs}ms both; } }`;

/**
 * `<gb-skeleton>`: a placeholder shape shown while data loads (brand.md, Loading). Lay skeletons out
 * like the real content, so nothing jumps when it arrives, and give each its width.
 *
 * - No attribute: a line of text, 9px tall, `raised` on `panel`. Set its `inline-size`.
 * - `block`: a row or box (`raised`, at least 30px tall), still, holding lines in `border`. Lay out
 *   its children with the block's own `display`, as with any element.
 *
 * It shows only after 300ms, so fast loads never flash. It's hidden from screen readers: mark the
 * loading area `aria-busy="true"` and give it a name. On a `raised` surface, set
 * `--gb-skeleton-fill: var(--border)` there so lines show.
 */
export class GbSkeleton extends HTMLElement {
  readonly #root = this.attachShadow({ mode: "open" });

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#root.append(style, document.createElement("slot"));
  }

  connectedCallback(): void {
    this.setAttribute("aria-hidden", "true");
  }
}

defineElement("gb-skeleton", GbSkeleton);
