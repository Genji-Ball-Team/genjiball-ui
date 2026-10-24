import { defineElement } from "./define.js";

// A raised tile, like the brand sheet's tier tiles: the label on top, then the number, big,
// condensed and tabular so tiles side by side line up.
const styles = `:host {
  display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--r); background: var(--raised);
}
:host([hidden]) { display: none; }
.label {
  color: var(--muted); font-size: var(--label-size); font-weight: var(--label-weight); font-stretch: var(--label-width);
  letter-spacing: var(--label-tracking); line-height: 1.3; text-transform: uppercase;
}
.value {
  color: var(--fg); font-size: 1.6rem; font-weight: var(--display-weight); font-stretch: var(--display-width);
  font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap;
}`;

/**
 * `<gb-stat label="Deflects">1,204</gb-stat>`: one number with its label, in a raised tile.
 *
 * The number is the content, formatted by the app, so it shows before the script loads. Screen
 * readers read the label, then the number. Lay tiles out in a grid; they stretch to fill it.
 */
export class GbStat extends HTMLElement {
  static readonly observedAttributes = ["label"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #label = document.createElement("div");

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    const value = document.createElement("div");
    value.className = "value";
    value.setAttribute("part", "value");
    value.append(document.createElement("slot"));
    this.#label.className = "label";
    this.#label.setAttribute("part", "label");
    this.#root.append(style, this.#label, value);
  }

  attributeChangedCallback(): void {
    this.#label.textContent = this.label;
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }

  set label(value: string) {
    this.setAttribute("label", value);
  }
}

defineElement("gb-stat", GbStat);
