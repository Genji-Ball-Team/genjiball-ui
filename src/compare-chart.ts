import {
  type Pad,
  type TierLine,
  chartStyles,
  draw,
  format,
  gridLines,
  plotPad,
  span,
  tierLine,
} from "./chart-parts.js";
import { type Spot, chartScale, spreadLabels, stepCorners } from "./chart-scale.js";
import { type Stop, compareStops, placeOf, timeOf } from "./compare-stops.js";
import { defineElement } from "./define.js";

/** One match on a player's line: their rating after it. */
export interface ComparePoint {
  readonly rating: number;
  /** When it was played: milliseconds or an ISO date. Needed for `axis="time"`. */
  readonly at?: number | string;
  /** What the screen reader and the `open` event call the match ("Match #412"). */
  readonly label?: string;
  /** The match page. A point with one can be clicked, or opened with Enter. */
  readonly href?: string;
}

/** A player's line: their name and their matches, oldest first. */
export interface CompareSeries {
  readonly name: string;
  readonly points: readonly ComparePoint[];
}

/** The `open` event's detail: the player, the match picked, and their indexes. */
export interface CompareOpenDetail {
  readonly series: number;
  readonly index: number;
  readonly point: ComparePoint;
}

// Three players at most, told apart by stroke as well as shade (brand.md, Charts): `fg` solid, `soft`
// dashed, `muted` dotted. Up and down don't apply, so there is no direction. Green is the cursor.
const styles = `:host {
  --gb-chart-bg: var(--panel);
  display: block; position: relative; contain: inline-size;
}
:host([hidden]) { display: none; }
${chartStyles}
.s0 { --c: var(--fg); }
.s1 { --c: var(--soft); }
.s2 { --c: var(--muted); }
.key { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0 0 8px; padding: 0; list-style: none; color: var(--soft); font-size: 0.8rem; }
.key[hidden] { display: none; }
.key li { display: flex; align-items: center; gap: 6px; }
.sw { display: inline-block; inline-size: 20px; border-block-start: 2px solid var(--c); }
.sw.s1 { border-block-start-style: dashed; }
.sw.s2 { border-block-start-style: dotted; }
.line { fill: none; stroke: var(--c); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.s1 > .line { stroke-dasharray: 7 5; stroke-linecap: butt; }
.s2 > .line { stroke-dasharray: 0.01 5; }
.last, .cursor .dot { fill: var(--c); stroke: var(--gb-chart-bg); stroke-width: 2; }
.name { fill: var(--c); font-size: 0.72rem; font-weight: 650; }
.row { display: flex; align-items: center; gap: 6px; }
.row b { margin-inline-start: auto; padding-inline-start: 10px; }
.when { color: var(--muted); }`;

const maxSeries = 3;
const pad: Pad = plotPad;
const whenFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/**
 * `<gb-compare-chart label="Ratings of Ana, Ben and Cy">`: up to three players' ratings on one chart,
 * as brand.md's Charts section draws it. Give it data with properties:
 *
 * - `series`: {@link CompareSeries}, one a player; the first three are drawn. Each has its `name`
 *   at the line's end and in a key above the chart.
 * - `tiers`: {@link TierLine}s. Those near the ratings shown get a dashed line and their chip.
 *
 * - `axis`: `matches` (the default) puts every player's nth match at the same place and draws lines
 *   from match to match; `time` puts matches where they were played and draws steps, since a rating
 *   holds until the next match. Points then need `at`.
 *
 * Hovering, tapping or the arrow keys show a tooltip with every player's rating at that point. A
 * click, a second tap or Enter fires a cancelable `open` event ({@link CompareOpenDetail}) for the
 * match under the cursor, the player whose line is nearest to it, then goes to the point's `href`.
 *
 * - `label`: what screen readers hear first. Without it, the players' names and where they went.
 * - `height`: in pixels. Without it, 240, or 180 in a box narrower than 480px.
 * - `--gb-chart-bg`: the surface the chart sits on, `panel` unless the app says so.
 */
export class GbCompareChart extends HTMLElement {
  static readonly observedAttributes = ["label", "height", "axis"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #key = document.createElement("ul");
  readonly #tip = document.createElement("div");
  readonly #said = document.createElement("p");
  readonly #svg = draw("svg", { role: "img", part: "chart" });
  #series: readonly CompareSeries[] = [];
  #tiers: readonly TierLine[] = [];
  // Where each player's points are drawn, the stops between them, and the one the cursor is on
  // (-1: none) with the player it would open.
  #lines: Spot[][] = [];
  #stops: (Stop & { readonly x: number })[] = [];
  #picked = -1;
  #owner = 0;
  #width = 0;
  #resize: ResizeObserver | undefined;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#key.className = "key";
    this.#key.setAttribute("aria-hidden", "true");
    this.#tip.className = "tip";
    this.#tip.hidden = true;
    this.#tip.setAttribute("aria-hidden", "true");
    this.#tip.setAttribute("part", "tooltip");
    this.#said.className = "gb-sr";
    this.#said.setAttribute("aria-live", "polite");
    this.#root.append(style, this.#key, this.#svg, this.#tip, this.#said);
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

  get series(): readonly CompareSeries[] {
    return this.#series;
  }

  set series(series: readonly CompareSeries[]) {
    this.#series = series.slice(0, maxSeries).map(({ name, points }) => ({
      name,
      points: points.filter((point) => Number.isFinite(point.rating)),
    }));
    if (this.isConnected) this.#render();
  }

  get tiers(): readonly TierLine[] {
    return this.#tiers;
  }

  set tiers(tiers: readonly TierLine[]) {
    this.#tiers = tiers;
    if (this.isConnected) this.#render();
  }

  get #byTime(): boolean {
    return this.getAttribute("axis") === "time";
  }

  /** The players' points in the order drawn: by time on a time axis, with the ones missing a time left out. */
  #drawn(): CompareSeries[] {
    if (!this.#byTime) return [...this.#series];
    return this.#series.map(({ name, points }) => ({
      name,
      points: points
        .filter((point) => Number.isFinite(timeOf(point)))
        .sort((a, b) => timeOf(a) - timeOf(b)),
    }));
  }

  #fillKey(series: readonly CompareSeries[]): void {
    this.#key.replaceChildren(
      ...series.map((one, n) => {
        const item = document.createElement("li");
        const swatch = document.createElement("i");
        swatch.className = `sw s${n}`;
        item.append(swatch, one.name);
        return item;
      }),
    );
  }

  #render(): void {
    // A redraw keeps the SVG, so a keyboard user keeps focus and the stop they're on.
    const svg = this.#svg;
    const kept = this.#root.activeElement === svg ? this.#picked : -1;
    this.#hide();
    const series = this.#drawn();
    const all = series.flatMap((one) => one.points);
    svg.replaceChildren();
    this.#fillKey(series);
    this.#key.hidden = all.length === 0;
    svg.style.display = all.length ? "" : "none";
    if (all.length === 0) {
      svg.removeAttribute("tabindex");
      return;
    }

    // happy-dom and a box not laid out yet have no width: draw at a likely one, then again on resize.
    this.#width = this.clientWidth;
    const width = this.#width || 600;
    const height = Number(this.getAttribute("height")) || (width < 480 ? 180 : 240);
    const names = this.#names(series, width);
    const room = { ...pad, right: names.room };
    const scale = chartScale(
      all.map((point) => point.rating),
      { thresholds: this.#tiers.map((tier) => tier.threshold) },
    );
    const y = (value: number) =>
      room.top + ((scale.hi - value) / (scale.hi - scale.lo)) * (height - room.top - room.bottom);
    this.#place(series, { width, room, y });

    const links = all.some((point) => point.href);
    for (const [name, value] of Object.entries({ width, height, tabindex: 0 }))
      svg.setAttribute(name, String(value));
    svg.classList.toggle("links", links);
    svg.setAttribute("aria-label", this.#label(series, links));

    // Names at close ends would overprint: they're spread apart.
    const nameYs = spreadLabels(
      this.#lines.map((spots) => spots.at(-1)?.y ?? Number.NaN),
      { gap: 13, max: height - 6 },
    );
    const box = { width, height, pad: room, lines: () => this.#vertices() };
    const tierLines = this.#tiers
      .filter((tier) => tier.threshold > scale.lo && tier.threshold < scale.hi)
      .map((tier) => tierLine(tier, y(tier.threshold), box));
    const cursor = draw("g", { class: "cursor", display: "none" });
    cursor.append(
      draw("line", { y1: room.top, y2: height - room.bottom }),
      ...series.map((_, n) => draw("circle", { class: `dot s${n}`, r: 4.5 })),
    );

    svg.append(
      gridLines(scale.ticks, y, { width, pad: room }),
      ...tierLines.map((tier) => tier.group),
      ...series.map((_, n) => this.#line(n, names.text[n] ?? "", nameYs[n] ?? 0)),
      cursor,
    );
    for (const tier of tierLines) tier.fit();
    if (kept >= 0) this.#show(kept, this.#owner);
  }

  // The room on the right for the names at the lines' ends: as wide as the longest, up to 14 letters
  // (10 on a phone). The key above the chart has them whole.
  #names(series: readonly CompareSeries[], width: number): { text: string[]; room: number } {
    const limit = width < 480 ? 10 : 14;
    const text = series.map(({ name }) =>
      name.length > limit ? `${name.slice(0, limit - 1)}…` : name,
    );
    return { text, room: 12 + Math.max(0, ...text.map((name) => name.length)) * 6.4 };
  }

  /** Works out where every point is drawn, and the stops the cursor and the keys move between. */
  #place(
    series: readonly CompareSeries[],
    { width, room, y }: { width: number; room: Pad; y: (value: number) => number },
  ): void {
    const byTime = this.#byTime;
    const stops = compareStops(series, byTime);
    const from = stops[0]?.at ?? 0;
    const to = stops.at(-1)?.at ?? 0;
    const inner = width - room.left - room.right;
    const xOf = (key: number) =>
      room.left + (to > from ? ((key - from) / (to - from)) * inner : inner / 2);
    this.#lines = series.map(({ points }) =>
      points.map((point, index) => ({
        x: xOf(placeOf(point, index, byTime)),
        y: y(point.rating),
      })),
    );
    this.#stops = stops.map((stop) => ({ ...stop, x: xOf(stop.at) }));
  }

  /** The lines as the corners they turn at: over time a rating holds, then steps to the next. */
  #vertices(): Spot[][] {
    return this.#byTime ? this.#lines.map(stepCorners) : this.#lines;
  }

  #line(n: number, name: string, nameY: number): SVGGElement {
    const group = draw("g", { class: `s${n}` });
    const vertices = this.#vertices()[n] ?? [];
    const end = vertices.at(-1);
    if (!end) return group;
    group.append(
      draw("path", {
        class: "line",
        d: vertices
          .map((spot, index) => `${index ? "L" : "M"}${spot.x.toFixed(1)} ${spot.y.toFixed(1)}`)
          .join(""),
      }),
      draw("circle", { class: "last", cx: end.x, cy: end.y, r: 4 }),
    );
    const label = draw("text", {
      class: "name",
      x: end.x + 9,
      y: nameY,
      dy: "0.35em",
    });
    label.textContent = name;
    group.append(label);
    return group;
  }

  #label(series: readonly CompareSeries[], links: boolean): string {
    const own = this.getAttribute("label")?.trim();
    const where = series
      .filter(({ points }) => points.length)
      .map(
        ({ name, points }) =>
          `${name} from ${format.format(points[0]?.rating ?? 0)} to ${format.format(points.at(-1)?.rating ?? 0)}`,
      )
      .join("; ");
    const summary =
      (own && (/[.!?]$/.test(own) ? own : `${own}.`)) ||
      `Ratings ${this.#byTime ? "over time" : "by match"}: ${where}.`;
    return `${summary} Arrow keys step through the points${links ? ", Enter opens one" : ""}.`;
  }

  #listen(svg: SVGSVGElement): void {
    // A mouse click opens the match under the cursor. A tap shows its stop first; a second tap on the
    // same stop opens it, so a phone can read the tooltip before leaving the page.
    let armed = false;
    const at = (event: PointerEvent) => {
      const box = svg.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      let best = 0;
      this.#stops.forEach((stop, index) => {
        if (Math.abs(stop.x - x) < Math.abs((this.#stops[best]?.x ?? 0) - x)) best = index;
      });
      return { stop: best, owner: this.#nearestOwner(best, y) };
    };
    svg.addEventListener("pointermove", (event) => {
      const { stop, owner } = at(event);
      this.#show(stop, owner);
    });
    svg.addEventListener("pointerdown", (event) => {
      const before = this.#picked;
      const { stop, owner } = at(event);
      this.#show(stop, owner);
      armed = event.pointerType === "mouse" || stop === before;
    });
    svg.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") this.#hide();
    });
    svg.addEventListener("click", () => {
      if (armed && this.#picked >= 0)
        this.open(this.#owner, this.#indexAt(this.#picked, this.#owner));
      armed = false;
    });
    svg.addEventListener("keydown", (event) => this.#keys(event));
    svg.addEventListener("blur", () => this.#hide());
  }

  #indexAt(stop: number, owner: number): number {
    return this.#stops[stop]?.index[owner] ?? -1;
  }

  /** The player whose point at a stop is nearest `y`: the one a click there opens. */
  #nearestOwner(stop: number, y?: number): number {
    const here = this.#stops[stop];
    if (!here) return 0;
    let best = -1;
    let distance = Number.POSITIVE_INFINITY;
    here.own.forEach((own, n) => {
      const spot = this.#lines[n]?.[here.index[n] ?? -1];
      if (!own || !spot) return;
      const away = y === undefined ? n : Math.abs(spot.y - y);
      if (away < distance) [best, distance] = [n, away];
    });
    return best >= 0 ? best : here.index.findIndex((index) => index >= 0);
  }

  #keys(event: KeyboardEvent): void {
    const lastIndex = this.#stops.length - 1;
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
      const stop = Math.max(0, Math.min(lastIndex, move));
      this.#show(stop, this.#nearestOwner(stop), true);
    } else if ((event.key === "Enter" || event.key === " ") && this.#picked >= 0) {
      event.preventDefault();
      this.open(this.#owner, this.#indexAt(this.#picked, this.#owner));
    } else if (event.key === "Escape" && this.#picked >= 0) {
      event.preventDefault();
      this.#hide();
    }
  }

  /** Opens a player's match: fires `open`, then goes to its `href` unless the event was canceled. */
  open(series: number, index: number): void {
    const point = this.#drawn()[series]?.points[index];
    if (!point) return;
    const detail: CompareOpenDetail = { series, index, point };
    const proceed = this.dispatchEvent(
      new CustomEvent("open", { detail, bubbles: true, cancelable: true }),
    );
    if (proceed && point.href) location.assign(point.href);
  }

  #show(stopIndex: number, owner: number, announce = false): void {
    const stop = this.#stops[stopIndex];
    const cursor = this.#svg.querySelector(".cursor");
    if (!stop || !cursor) return;
    this.#picked = stopIndex;
    this.#owner = owner;
    cursor.removeAttribute("display");
    const [line, ...dots] = cursor.children;
    line?.setAttribute("x1", String(stop.x));
    line?.setAttribute("x2", String(stop.x));
    const series = this.#drawn();
    // Over time the dot sits on the player's rating then, which is the stop's x, not their match's.
    series.forEach((_, n) => {
      const spot = this.#lines[n]?.[stop.index[n] ?? -1];
      const dot = dots[n];
      dot?.setAttribute("display", spot ? "" : "none");
      if (!spot) return;
      dot?.setAttribute("cx", String(stop.x));
      dot?.setAttribute("cy", String(spot.y));
    });

    const when = this.#byTime ? whenFormat.format(stop.at) : `Match ${stop.at + 1}`;
    const rows = series.map(({ name, points }, n) => {
      const point = points[stop.index[n] ?? -1];
      const row = span("row", "");
      const swatch = document.createElement("i");
      swatch.className = `sw s${n}`;
      const rating = document.createElement("b");
      rating.textContent = point ? format.format(point.rating) : "–";
      row.append(swatch, name, rating);
      return { row, text: `${name} ${point ? format.format(point.rating) : "not yet"}` };
    });
    this.#tip.replaceChildren(span("when", when), ...rows.map(({ row }) => row));
    const point = series[owner]?.points[this.#indexAt(stopIndex, owner)];
    if (point?.href) this.#tip.append(span("go", "Open match →"));
    this.#tip.hidden = false;

    // Beside the cursor, at the top, to cover the lines as little as it can.
    const width = this.#width || Number(this.#svg.getAttribute("width"));
    const room = this.#tip.offsetWidth + 12;
    const left = stop.x + 12 + this.#tip.offsetWidth > width ? stop.x - room : stop.x + 12;
    this.#tip.style.translate = `${Math.max(0, left)}px ${this.#svg.getBoundingClientRect().top - this.getBoundingClientRect().top + pad.top}px`;
    if (announce) this.#said.textContent = `${when}: ${rows.map(({ text }) => text).join(", ")}`;
  }

  #hide(): void {
    this.#picked = -1;
    this.#tip.hidden = true;
    this.#svg.querySelector(".cursor")?.setAttribute("display", "none");
  }
}

defineElement("gb-compare-chart", GbCompareChart);
