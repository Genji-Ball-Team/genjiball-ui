import { type Spot, lineCrosses } from "./chart-scale.js";
import type { Tier } from "./chip.js";

/** A tier threshold: a dashed line in the tier's colour with its chip. */
export interface TierLine {
  readonly tier: Tier;
  /** The chip's text, as you'd say it ("Grandmaster"). */
  readonly label: string;
  readonly threshold: number;
}

/** The room a chart leaves around its plot, in pixels. */
export interface Pad {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const plotPad: Pad = { top: 10, right: 10, bottom: 10, left: 42 };

const svgNs = "http://www.w3.org/2000/svg";
const chip = { height: 14, padding: 5, gap: 3 };

export const format = new Intl.NumberFormat("en");

// The tooltip's look, for every chart (brand.md, Overlays): a green edge, floating on `raised`.
export const tipStyles = `.tip {
  position: absolute; inset: 0 auto auto 0; display: flex; flex-direction: column; gap: 1px; padding: 5px 9px;
  border: 1px solid var(--green); border-radius: var(--r); background: var(--raised); box-shadow: var(--shadow-float);
  color: var(--fg); font-size: 0.74rem; font-variant-numeric: tabular-nums; line-height: 1.35; white-space: nowrap;
  pointer-events: none; transition: opacity var(--fade-duration);
}
.tip[hidden] { display: flex; opacity: 0; visibility: hidden; }
.meta { color: var(--muted); }
.up { color: var(--up); }
.down { color: var(--down); }
.none { color: var(--muted); }
.go { color: var(--green); font-size: 0.68rem; font-weight: 650; }
.gb-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .tip { transition: none; } }`;

// What the line charts share: a recessive grid and axis, the tier lines and chips in their tier's
// colour and the green cursor (brand.md, Charts).
export const chartStyles = `svg { display: block; overflow: visible; border-radius: var(--r); font-family: var(--font); touch-action: pan-y; }
svg:focus-visible { outline: 2px solid var(--green); outline-offset: 4px; }
svg.links { cursor: pointer; }
.grid line { stroke: var(--line); }
.grid text { fill: var(--muted); font-size: var(--label-size); font-variant-numeric: tabular-nums; }
.tier line { stroke: var(--tier); stroke-dasharray: 4 4; }
.tier rect { fill: color-mix(in oklch, var(--tier) 16%, var(--gb-chart-bg)); }
.tier text { fill: var(--tier); font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; }
.cursor line { stroke: color-mix(in oklch, var(--green) 50%, transparent); }
${tipStyles}`;

export function draw<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(svgNs, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

export function span(className: string, text: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

/** The faint grid lines with their rating labels, on the left. */
export function gridLines(
  ticks: readonly number[],
  y: (value: number) => number,
  { width, pad }: { width: number; pad: Pad },
): SVGGElement {
  const grid = draw("g", { class: "grid" });
  for (const tick of ticks) {
    grid.append(draw("line", { x1: pad.left, x2: width - pad.right, y1: y(tick), y2: y(tick) }));
    const text = draw("text", { x: pad.left - 8, y: y(tick), dy: "0.32em", "text-anchor": "end" });
    text.textContent = format.format(tick);
    grid.append(text);
  }
  return grid;
}

/** Where a tier line goes: its box, and the lines of the chart its chip must stay clear of. */
export interface TierBox {
  readonly width: number;
  readonly height: number;
  readonly pad: Pad;
  /** Each line as the points it passes through, left to right. */
  readonly lines: () => readonly (readonly Spot[])[];
}

// The chip goes at the left end of its line, above it, or else wherever the rating lines don't run
// through it: below, then at the right end. Its width comes from the text, so it can only be placed
// once the SVG is in the page.
export function tierLine(
  tier: TierLine,
  at: number,
  { width, height, pad, lines }: TierBox,
): { group: SVGGElement; fit: () => void } {
  const group = draw("g", { class: "tier" });
  group.style.setProperty("--tier", `var(--t-${tier.tier})`);
  const rect = draw("rect", { height: chip.height, rx: 4 });
  const text = draw("text", { dy: "0.35em" });
  text.textContent = tier.label.toUpperCase();
  group.append(draw("line", { x1: pad.left, x2: width - pad.right, y1: at, y2: at }), rect, text);
  const fit = () => {
    const measured =
      typeof text.getComputedTextLength === "function" ? text.getComputedTextLength() : 0;
    const chipWidth = (measured || tier.label.length * 7) + chip.padding * 2;
    const lefts = [pad.left + 4, width - pad.right - 4 - chipWidth];
    const tops = [at - chip.gap - chip.height, at + chip.gap];
    const places = lefts
      .flatMap((x) => tops.map((y) => ({ x, y })))
      .filter((place) => place.y >= 0 && place.y + chip.height <= height);
    const clear = places.find((place) =>
      lines().every(
        (spots) => !lineCrosses(spots, place, { x: place.x + chipWidth, y: place.y + chip.height }),
      ),
    );
    const place = clear ?? places[0] ?? { x: lefts[0] ?? 0, y: at + chip.gap };
    rect.setAttribute("x", String(place.x));
    rect.setAttribute("y", String(place.y));
    rect.setAttribute("width", String(chipWidth));
    text.setAttribute("x", String(place.x + chip.padding));
    text.setAttribute("y", String(place.y + chip.height / 2));
  };
  return { group, fit };
}
