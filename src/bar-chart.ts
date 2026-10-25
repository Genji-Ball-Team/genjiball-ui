import { format, span, tipStyles } from "./chart-parts.js";
import { defineElement } from "./define.js";

/** One bar: a value, and what to say about it. */
export interface Bar {
  readonly value: number;
  /** What the bar is, for its tooltip and screen readers ("Mon, Oct 5"). */
  readonly label: string;
  /** The value as said ("12 rated rounds"). Without it, the number. */
  readonly text?: string;
  /** More under the tooltip's label, and after it for screen readers ("3 matches · 5 players"). */
  readonly detail?: string;
  /** A shorter label for the axis ("Oct 5"). Without it, `label`. */
  readonly axis?: string;
}

// Bars in `muted`, the hovered or focused one in `fg`; a zero is a 2px stub in `border` so the day still
// shows (brand.md, Charts). Rounded at the top only. Green is the focus ring, as everywhere.
const styles = `:host { display: block; position: relative; contain: inline-size; }
:host([hidden]) { display: none; }
.bars {
  display: flex; align-items: flex-end; justify-content: space-around; gap: 2px;
  block-size: var(--gb-bar-height, 120px);
  margin: 0; padding: 0; list-style: none;
}
.bar {
  /* A few bars stay bar-shaped instead of filling the chart. */
  flex: 1 1 0; min-inline-size: 1px; max-inline-size: 48px; border-radius: 3px 3px 0 0; background: var(--muted); outline-offset: 2px;
  transition: background-color var(--fade-duration);
}
.bar.zero { background: var(--border); block-size: 2px; border-radius: 0; }
.bar:hover, .bar:focus-visible { background: var(--fg); }
.bar:focus-visible { outline: 2px solid var(--green); }
.axis {
  display: flex; justify-content: space-between; margin: 6px 0 0; color: var(--muted);
  font-size: var(--label-size); font-variant-numeric: tabular-nums;
}
${tipStyles}
@media (prefers-reduced-motion: reduce) { .bar { transition: none; } }`;

/**
 * `<gb-bar-chart label="Rated rounds a day">`: a bar for each day (or hour, or week) with a value,
 * as brand.md's Charts section draws it. Give it data with a property:
 *
 * - `bars`: {@link Bar}s, oldest first. The axis is the first and last bar's `axis` (or `label`).
 *
 * Hovering or focusing a bar shows a tooltip with its value, label and detail. Each bar is focusable
 * and the arrow keys (Home and End too) step between them; the tab key stops once on the row.
 * Screen readers hear each bar's label, value and detail.
 *
 * - `label`: what the chart is. Screen readers hear it with the highest value ("Rated rounds a day,
 *   most 24") before the bars.
 * - `height`: in pixels. Without it, 120.
 */
export class GbBarChart extends HTMLElement {
  static readonly observedAttributes = ["label", "height"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #list = document.createElement("div");
  readonly #axis = document.createElement("p");
  readonly #tip = document.createElement("div");
  #bars: readonly Bar[] = [];
  // The bar the arrow keys are on: the one with tabindex 0.
  #current = 0;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#list.className = "bars";
    this.#list.setAttribute("role", "group");
    this.#axis.className = "axis";
    this.#axis.setAttribute("aria-hidden", "true");
    this.#tip.className = "tip";
    this.#tip.hidden = true;
    this.#tip.setAttribute("aria-hidden", "true");
    this.#tip.setAttribute("part", "tooltip");
    this.#root.append(style, this.#list, this.#axis, this.#tip);
    this.#list.addEventListener("keydown", (event) => this.#key(event));
    this.#list.addEventListener("pointerover", (event) => {
      const index = this.#indexOf(event.target);
      if (index >= 0) this.#show(index);
    });
    this.#list.addEventListener("pointerleave", () => this.#hide());
    this.#list.addEventListener("focusin", (event) => {
      const index = this.#indexOf(event.target);
      if (index >= 0) this.#show(index);
    });
    this.#list.addEventListener("focusout", () => this.#hide());
  }

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  get bars(): readonly Bar[] {
    return this.#bars;
  }

  set bars(bars: readonly Bar[]) {
    this.#bars = bars.filter((bar) => Number.isFinite(bar.value));
    this.#current = Math.min(this.#current, Math.max(0, this.#bars.length - 1));
    if (this.isConnected) this.#render();
  }

  #indexOf(target: EventTarget | null): number {
    return target instanceof HTMLElement ? [...this.#list.children].indexOf(target) : -1;
  }

  #spoken(bar: Bar): string {
    return `${bar.label}: ${bar.text ?? format.format(bar.value)}${bar.detail ? `, ${bar.detail}` : ""}`;
  }

  #render(): void {
    this.#hide();
    const bars = this.#bars;
    const most = Math.max(0, ...bars.map((bar) => bar.value));
    this.#list.style.setProperty(
      "--gb-bar-height",
      `${Number(this.getAttribute("height")) || 120}px`,
    );
    const own = this.getAttribute("label")?.trim();
    const summary = own ?? `${bars.length} ${bars.length === 1 ? "bar" : "bars"}`;
    this.#list.setAttribute(
      "aria-label",
      `${summary}, most ${format.format(most)}. Arrow keys step between the bars.`,
    );
    this.#list.replaceChildren(
      ...bars.map((bar, index) => {
        const element = document.createElement("div");
        element.className = bar.value > 0 ? "bar" : "bar zero";
        element.setAttribute("role", "img");
        element.setAttribute("aria-label", this.#spoken(bar));
        element.tabIndex = index === this.#current ? 0 : -1;
        if (bar.value > 0) element.style.blockSize = `${((100 * bar.value) / most).toFixed(1)}%`;
        return element;
      }),
    );
    const first = bars[0];
    const last = bars.at(-1);
    this.#axis.replaceChildren(
      ...(first && last ? [first, ...(last === first ? [] : [last])] : []).map((bar) =>
        span("", bar.axis ?? bar.label),
      ),
    );
  }

  #key(event: KeyboardEvent): void {
    const lastIndex = this.#bars.length - 1;
    const from = this.#indexOf(event.target);
    const moves: Record<string, number> = {
      ArrowLeft: from - 1,
      ArrowRight: from + 1,
      Home: 0,
      End: lastIndex,
    };
    const move = moves[event.key];
    if (move === undefined || from < 0) return;
    event.preventDefault();
    const to = Math.max(0, Math.min(lastIndex, move));
    const bars = [...this.#list.children] as HTMLElement[];
    this.#current = to;
    bars.forEach((bar, index) => (bar.tabIndex = index === to ? 0 : -1));
    bars[to]?.focus();
  }

  #show(index: number): void {
    const bar = this.#bars[index];
    const element = this.#list.children[index];
    if (!bar || !(element instanceof HTMLElement)) return;
    const value = document.createElement("b");
    value.textContent = bar.text ?? format.format(bar.value);
    this.#tip.replaceChildren(value, span("meta", bar.label));
    if (bar.detail) this.#tip.append(span("meta", bar.detail));
    this.#tip.hidden = false;

    // Above the bar, inside the box.
    const centre = element.offsetLeft + element.offsetWidth / 2;
    const width = this.clientWidth || this.#list.offsetWidth;
    const left = Math.min(
      Math.max(0, centre - this.#tip.offsetWidth / 2),
      Math.max(0, width - this.#tip.offsetWidth),
    );
    const top = Math.max(0, element.offsetTop - this.#tip.offsetHeight - 8);
    this.#tip.style.translate = `${left}px ${top}px`;
  }

  #hide(): void {
    this.#tip.hidden = true;
  }
}

defineElement("gb-bar-chart", GbBarChart);
