import { defineElement } from "./define.js";
import { motionAllowed } from "./motion.js";

// Never colour alone (brand.md, Colour): the arrow says which way, the colour only repeats it.
const styles = `:host {
  display: inline-block; font-size: 0.78rem; font-weight: 650; font-variant-numeric: tabular-nums;
  line-height: 1; white-space: nowrap; color: var(--muted);
}
:host([hidden]) { display: none; }
:host([direction="up"]) { color: var(--up); }
:host([direction="down"]) { color: var(--down); }
[part="value"] { display: inline-block; }
.in { animation: delta-in var(--delta-duration) var(--delta-delay) ease-out both; }
@keyframes delta-in { from { opacity: 0; transform: translateY(4px); } }
@media (prefers-reduced-motion: reduce) { .in { animation: none; } }
.gb-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`;

const format = new Intl.NumberFormat("en");

/**
 * `<gb-delta value="24"></gb-delta>`: a rating change, "▲ 24" in `up` or "▼ 11" in `down`. A zero
 * is a muted "–". Screen readers hear "up 24" or "down 11".
 *
 * - `value`: the change, a number. Signed: `-11` is a loss. Anything that isn't a number shows
 *   nothing.
 * - `direction` is set from it (`up`, `down` or `none`), for styling around the element.
 * - When the value changes from one number to another, the new one fades in, a moment after a
 *   `<gb-count>` next to it starts counting (brand.md, Genji touch). Never the first value, and not
 *   under reduced motion.
 */
export class GbDelta extends HTMLElement {
  static readonly observedAttributes = ["value"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #shown = document.createElement("span");
  readonly #spoken = document.createElement("span");
  #shownValue: number | undefined;

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
    this.#render();
  }

  attributeChangedCallback(): void {
    const before = this.#shownValue;
    this.#render();
    const after = this.#shownValue;
    if (this.isConnected && before !== undefined && after !== undefined && before !== after) {
      this.#fadeIn();
    }
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

  #fadeIn(): void {
    this.#shown.classList.remove("in");
    if (!motionAllowed()) return;
    // Reading the size restarts the animation when the class comes straight back.
    void this.#shown.offsetWidth;
    this.#shown.classList.add("in");
  }

  #render(): void {
    const value = this.value;
    this.#shownValue = value;
    const amount = value === undefined ? "" : format.format(Math.abs(value));
    const direction = value === undefined || value === 0 ? "none" : value > 0 ? "up" : "down";
    if (this.getAttribute("direction") !== direction) this.setAttribute("direction", direction);
    if (value === undefined) {
      this.#shown.textContent = "";
      this.#spoken.textContent = "";
    } else if (direction === "none") {
      this.#shown.textContent = "–";
      this.#spoken.textContent = "no change";
    } else {
      this.#shown.textContent = `${direction === "up" ? "▲" : "▼"} ${amount}`;
      this.#spoken.textContent = `${direction} ${amount}`;
    }
  }
}

defineElement("gb-delta", GbDelta);
