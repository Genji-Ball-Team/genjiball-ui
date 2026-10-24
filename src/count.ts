import { defineElement } from "./define.js";
import { durationMs, motionAllowed } from "./motion.js";
import { tokens } from "./tokens.js";

const styles = `:host { display: inline; font-variant-numeric: tabular-nums; white-space: nowrap; }
:host([hidden]) { display: none; }
.gb-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`;

const format = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

// The count-ease token is CSS `ease-out`; a cubic ease-out is close and needs no curve solver.
const ease = (progress: number) => 1 - (1 - progress) ** 3;

export interface CountDetail {
  from: number;
  to: number;
}

/**
 * `<gb-count value="1842"></gb-count>`: a whole number, formatted ("1,842") and tabular, that
 * counts up or down to its new value when it changes in front of you (brand.md, Genji touch).
 *
 * - `value`: the number. Anything that isn't a number shows nothing.
 * - The first value shows straight away, so nothing counts on page load. Only a change from one
 *   number to another counts, over `count-duration` with an ease-out. Under reduced motion, or on
 *   a page in the background, the new value shows at once.
 * - When it starts counting it fires a bubbling `count` event (`detail: { from, to }`), which plays
 *   the blade slash of a `<gb-slash>` around it.
 * - Screen readers get the new value at once, never the numbers in between.
 */
export class GbCount extends HTMLElement {
  static readonly observedAttributes = ["value"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #shown = document.createElement("span");
  readonly #spoken = document.createElement("span");
  #current: number | undefined;
  #frame = 0;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#shown.setAttribute("aria-hidden", "true");
    this.#shown.setAttribute("part", "value");
    this.#spoken.className = "gb-sr";
    this.#root.append(style, this.#shown, this.#spoken);
  }

  connectedCallback(): void {
    this.#settle(this.value);
  }

  disconnectedCallback(): void {
    this.#settle(this.value);
  }

  attributeChangedCallback(): void {
    const to = this.value;
    const from = this.#current;
    if (!this.isConnected || from === undefined || to === undefined || !motionAllowed()) {
      this.#settle(to);
      return;
    }
    if (Math.round(from) === Math.round(to)) return;
    this.#count(from, to);
  }

  get value(): number | undefined {
    const text = this.getAttribute("value");
    const value = text === null || text.trim() === "" ? Number.NaN : Number(text);
    return Number.isFinite(value) ? value : undefined;
  }

  set value(value: number | undefined) {
    if (value === undefined) this.removeAttribute("value");
    else this.setAttribute("value", String(value));
  }

  // Shows `value` and stops any count in progress.
  #settle(value: number | undefined): void {
    cancelAnimationFrame(this.#frame);
    this.#current = value;
    const text = value === undefined ? "" : format.format(value);
    this.#shown.textContent = text;
    this.#spoken.textContent = text;
  }

  // Counts from what's shown now, so a change during a count carries on from there.
  #count(from: number, to: number): void {
    cancelAnimationFrame(this.#frame);
    this.#spoken.textContent = format.format(to);
    const duration = durationMs(tokens["count-duration"]);
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / duration);
      this.#current = from + (to - from) * ease(progress);
      this.#shown.textContent = format.format(this.#current);
      if (progress < 1) this.#frame = requestAnimationFrame(tick);
      else this.#settle(to);
    };
    this.#frame = requestAnimationFrame(tick);
    this.dispatchEvent(
      new CustomEvent<CountDetail>("count", {
        bubbles: true,
        composed: true,
        detail: { from, to },
      }),
    );
  }
}

defineElement("gb-count", GbCount);
