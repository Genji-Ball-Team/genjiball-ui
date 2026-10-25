import {
  type TierLine,
  chartStyles,
  draw,
  format,
  gridLines,
  plotPad as pad,
  span,
  tierLine,
} from "./chart-parts.js";
import { type Spot, chartScale, ordinal } from "./chart-scale.js";
import { defineElement } from "./define.js";

export type { TierLine } from "./chart-parts.js";

/** One match on the chart: the player's rating after it. */
export interface RatingPoint {
  readonly rating: number;
  /** The rating change in this match. Without it, the difference from the point before. */
  readonly change?: number;
  /** What the tooltip calls the match ("Match #412"). Without it, "Match 1", "Match 2"… */
  readonly label?: string;
  /** The player's place in the match, and how many played it ("2nd of 6"). */
  readonly place?: number;
  readonly players?: number;
  /** The match page. A point with one can be clicked, or opened with Enter. */
  readonly href?: string;
}

/** The `open` event's detail: the point picked, and its index in `points`. */
export interface OpenDetail {
  readonly index: number;
  readonly point: RatingPoint;
}

// Recessive grid and axis, one axis only; colour only where it means something (brand.md, Charts).
// The line is `up` or `down` from the net change, the tier lines and chips their tier's colour, and
// green is the cursor: the thing you can click. The chips are drawn in the SVG, under the line.
const styles = `:host {
  --gb-chart-bg: var(--panel); --gb-chart-line: var(--soft);
  display: block; position: relative; contain: inline-size;
}
:host([hidden]) { display: none; }
:host([direction="up"]) { --gb-chart-line: var(--up); }
:host([direction="down"]) { --gb-chart-line: var(--down); }
${chartStyles}
.line { fill: none; stroke: var(--gb-chart-line); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.last { fill: var(--gb-chart-line); stroke: var(--gb-chart-bg); stroke-width: 2; }
.cursor circle { fill: var(--green); stroke: var(--gb-chart-bg); stroke-width: 2; }`;

/**
 * `<gb-rating-chart label="Rating over the last 40 matches">`: a player's rating after each match,
 * as brand.md's Charts section draws it. Give it data with properties:
 *
 * - `points`: {@link RatingPoint}s, oldest first.
 * - `tiers`: {@link TierLine}s. Those near the ratings shown get a dashed line and their chip.
 *
 * The whole line is `up` if the rating went up over the points shown and `down` if it went down
 * (`direction` on the element says which, for a header's delta to match). Hovering, tapping or the
 * arrow keys show a point's match, place, rating and change; a click, a second tap or Enter fires a
 * cancelable `open` event ({@link OpenDetail}) and then goes to the point's `href`.
 *
 * - `label`: what screen readers hear first. Without it, "Rating over 40 matches, from … to …".
 * - `height`: in pixels. Without it, 240, or 180 in a box narrower than 480px.
 * - `--gb-chart-bg`: the surface the chart sits on, `panel` unless the app says so.
 */
export class GbRatingChart extends HTMLElement {
  static readonly observedAttributes = ["label", "height"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #tip = document.createElement("div");
  readonly #said = document.createElement("p");
  readonly #svg = draw("svg", { role: "img", part: "chart" });
  #points: readonly RatingPoint[] = [];
  #tiers: readonly TierLine[] = [];
  // Where each point is drawn, and the one the cursor is on (-1: none).
  #spots: Spot[] = [];
  #picked = -1;
  #width = 0;
  #resize: ResizeObserver | undefined;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#tip.className = "tip";
    this.#tip.hidden = true;
    this.#tip.setAttribute("aria-hidden", "true");
    this.#tip.setAttribute("part", "tooltip");
    this.#said.className = "gb-sr";
    this.#said.setAttribute("aria-live", "polite");
    this.#root.append(style, this.#svg, this.#tip, this.#said);
    this.#listen(this.#svg);
  }

  connectedCallback(): void {
    this.#render();
    if (typeof ResizeObserver === "undefined") return;
    this.#resize = new ResizeObserver(() => {
      if (this.clientWidth !== this.#width) this.#render();
    });
    this.#resize.observe(this);
  }

  disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = undefined;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  get points(): readonly RatingPoint[] {
    return this.#points;
  }

  set points(points: readonly RatingPoint[]) {
    this.#points = points.filter((point) => Number.isFinite(point.rating));
    if (this.isConnected) this.#render();
  }

  get tiers(): readonly TierLine[] {
    return this.#tiers;
  }

  set tiers(tiers: readonly TierLine[]) {
    this.#tiers = tiers;
    if (this.isConnected) this.#render();
  }

  /** The change shown for a point: its own, or the difference from the point before. */
  #changeAt(index: number): number | undefined {
    const point = this.#points[index];
    const before = this.#points[index - 1];
    if (!point) return undefined;
    return point.change ?? (before ? point.rating - before.rating : undefined);
  }

  #render(): void {
    // A redraw keeps the SVG, so a keyboard user keeps focus and the point they're on.
    const svg = this.#svg;
    const kept = this.#root.activeElement === svg ? this.#picked : -1;
    this.#hide();
    const points = this.#points;
    const first = points[0];
    const last = points.at(-1);
    const net = first && last ? last.rating - first.rating : 0;
    const direction = net > 0 ? "up" : net < 0 ? "down" : "none";
    if (this.getAttribute("direction") !== direction) this.setAttribute("direction", direction);
    svg.replaceChildren();
    svg.style.display = first && last ? "" : "none";
    if (!first || !last) {
      svg.removeAttribute("tabindex");
      return;
    }

    // happy-dom and a box not laid out yet have no width: draw at a likely one, then again on resize.
    this.#width = this.clientWidth;
    const width = this.#width || 600;
    const height = Number(this.getAttribute("height")) || (width < 480 ? 180 : 240);
    const scale = chartScale(
      points.map((point) => point.rating),
      { thresholds: this.#tiers.map((tier) => tier.threshold) },
    );
    const y = (value: number) =>
      pad.top + ((scale.hi - value) / (scale.hi - scale.lo)) * (height - pad.top - pad.bottom);
    const inner = width - pad.left - pad.right;
    this.#spots = points.map((point, index) => ({
      x: pad.left + (points.length > 1 ? (index / (points.length - 1)) * inner : inner / 2),
      y: y(point.rating),
    }));

    const links = points.some((point) => point.href);
    for (const [name, value] of Object.entries({ width, height, tabindex: 0 }))
      svg.setAttribute(name, String(value));
    svg.classList.toggle("links", links);
    svg.setAttribute("aria-label", this.#label(links));

    const grid = gridLines(scale.ticks, y, { width, pad });
    const tierLines = this.#tiers
      .filter((tier) => tier.threshold > scale.lo && tier.threshold < scale.hi)
      .map((tier) =>
        tierLine(tier, y(tier.threshold), { width, height, pad, lines: () => [this.#spots] }),
      );

    const line = draw("path", {
      class: "line",
      d: this.#spots
        .map((spot, index) => `${index ? "L" : "M"}${spot.x.toFixed(1)} ${spot.y.toFixed(1)}`)
        .join(""),
    });
    const end = this.#spots.at(-1) ?? { x: 0, y: 0 };
    const dot = draw("circle", { class: "last", cx: end.x, cy: end.y, r: 4 });
    const cursor = draw("g", { class: "cursor", display: "none" });
    cursor.append(
      draw("line", { y1: pad.top, y2: height - pad.bottom }),
      draw("circle", { r: 4.5 }),
    );

    svg.append(grid, ...tierLines.map((tier) => tier.group), line, dot, cursor);
    for (const tier of tierLines) tier.fit();
    if (kept >= 0) this.#show(kept);
  }

  #label(links: boolean): string {
    const first = this.#points[0];
    const last = this.#points.at(-1);
    const count = this.#points.length;
    const own = this.getAttribute("label")?.trim();
    const summary =
      (own && (/[.!?]$/.test(own) ? own : `${own}.`)) ||
      `Rating over ${count} ${count === 1 ? "match" : "matches"}, from ${format.format(first?.rating ?? 0)} to ${format.format(last?.rating ?? 0)}.`;
    return `${summary} Arrow keys step through the matches${links ? ", Enter opens one" : ""}.`;
  }

  #listen(svg: SVGSVGElement): void {
    // A mouse click opens the point under the cursor. A tap shows its point first; a second tap on the
    // same point opens it, so a phone can read the tooltip before leaving the page.
    let armed = false;
    const nearest = (event: PointerEvent) => {
      const left = svg.getBoundingClientRect().left;
      const x = event.clientX - left;
      let best = 0;
      this.#spots.forEach((spot, index) => {
        if (Math.abs(spot.x - x) < Math.abs((this.#spots[best]?.x ?? 0) - x)) best = index;
      });
      return best;
    };
    svg.addEventListener("pointermove", (event) => this.#show(nearest(event)));
    svg.addEventListener("pointerdown", (event) => {
      const before = this.#picked;
      const index = nearest(event);
      this.#show(index);
      armed = event.pointerType === "mouse" || index === before;
    });
    svg.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") this.#hide();
    });
    svg.addEventListener("click", () => {
      if (armed && this.#picked >= 0) this.open(this.#picked);
      armed = false;
    });
    svg.addEventListener("keydown", (event) => this.#key(event));
    svg.addEventListener("blur", () => this.#hide());
  }

  #key(event: KeyboardEvent): void {
    const lastIndex = this.#spots.length - 1;
    const from = this.#picked < 0 ? lastIndex + 1 : this.#picked;
    const moves: Record<string, number> = {
      ArrowLeft: from - 1,
      ArrowRight: this.#picked < 0 ? lastIndex : from + 1,
      Home: 0,
      End: lastIndex,
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      this.#show(Math.max(0, Math.min(lastIndex, move)), true);
    } else if ((event.key === "Enter" || event.key === " ") && this.#picked >= 0) {
      event.preventDefault();
      this.open(this.#picked);
    } else if (event.key === "Escape" && this.#picked >= 0) {
      event.preventDefault();
      this.#hide();
    }
  }

  /** Opens a point's match: fires `open`, then goes to its `href` unless the event was canceled. */
  open(index: number): void {
    const point = this.#points[index];
    if (!point) return;
    const detail: OpenDetail = { index, point };
    const proceed = this.dispatchEvent(
      new CustomEvent("open", { detail, bubbles: true, cancelable: true }),
    );
    if (proceed && point.href) location.assign(point.href);
  }

  #show(index: number, announce = false): void {
    const point = this.#points[index];
    const spot = this.#spots[index];
    const cursor = this.#svg.querySelector(".cursor");
    if (!point || !spot || !cursor) return;
    this.#picked = index;
    cursor.removeAttribute("display");
    const [line, dot] = cursor.children;
    line?.setAttribute("x1", String(spot.x));
    line?.setAttribute("x2", String(spot.x));
    dot?.setAttribute("cx", String(spot.x));
    dot?.setAttribute("cy", String(spot.y));

    const meta = [point.label ?? `Match ${index + 1}`];
    if (point.place)
      meta.push(
        point.players ? `${ordinal(point.place)} of ${point.players}` : ordinal(point.place),
      );
    const change = this.#changeAt(index);
    const value = document.createElement("span");
    const rating = document.createElement("b");
    rating.textContent = format.format(point.rating);
    value.append(rating);
    let spoken = "";
    if (change !== undefined) {
      const amount = format.format(Math.abs(change));
      const way = change > 0 ? "up" : change < 0 ? "down" : "none";
      value.append(" ", span(way, way === "none" ? "–" : `${way === "up" ? "▲" : "▼"} ${amount}`));
      spoken = way === "none" ? ", no change" : `, ${way} ${amount}`;
    }
    this.#tip.replaceChildren(span("meta", meta.join(" · ")), value);
    if (point.href) this.#tip.append(span("go", "Open match →"));
    this.#tip.hidden = false;

    // Above the point, inside the box; below it when there's no room above.
    const width = this.#width || Number(this.#svg.getAttribute("width"));
    const left = Math.min(
      Math.max(0, spot.x - this.#tip.offsetWidth / 2),
      width - this.#tip.offsetWidth,
    );
    const above = spot.y - this.#tip.offsetHeight - 10;
    this.#tip.style.translate = `${Math.max(0, left)}px ${above < 0 ? spot.y + 12 : above}px`;
    if (announce)
      this.#said.textContent = `${meta.join(", ")}, ${format.format(point.rating)}${spoken}`;
  }

  #hide(): void {
    this.#picked = -1;
    this.#tip.hidden = true;
    this.#svg.querySelector(".cursor")?.setAttribute("display", "none");
  }
}

defineElement("gb-rating-chart", GbRatingChart);
