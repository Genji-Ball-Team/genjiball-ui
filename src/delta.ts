import { defineElement } from "./define.js";

// Never colour alone (brand.md, Colour): the arrow says which way, the colour only repeats it.
const styles = `:host {
  display: inline-block; font-size: 0.78rem; font-weight: 650; font-variant-numeric: tabular-nums;
  line-height: 1; white-space: nowrap; color: var(--muted);
}
:host([hidden]) { display: none; }
:host([direction="up"]) { color: var(--up); }
:host([direction="down"]) { color: var(--down); }
.gb-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`;

const format = new Intl.NumberFormat("en");

/**
 * `<gb-delta value="24"></gb-delta>`: a rating change, "▲ 24" in `up` or "▼ 11" in `down`. A zero
 * is a muted "–". Screen readers hear "up 24" or "down 11".
 *
 * - `value`: the change, a number. Signed: `-11` is a loss. Anything that isn't a number shows
 *   nothing.
 * - `direction` is set from it (`up`, `down` or `none`), for styling around the element.
 */
export class GbDelta extends HTMLElement {
  static readonly observedAttributes = ["value"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #shown = document.createElement("span");
  readonly #spoken = document.createElement("span");

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
    this.#render();
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

  #render(): void {
    const value = this.value;
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
