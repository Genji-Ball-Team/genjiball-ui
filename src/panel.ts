import { defineElement } from "./define.js";

// Flat at rest: a panel is told apart from the page by its background step and a 1px line, never a
// shadow. A raised panel sits inside another one and needs no line, the step is enough. The label is
// the brand sheet's small uppercase heading over a panel's content.
const styles = `:host {
  display: block; padding: 16px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel);
}
:host([hidden]) { display: none; }
:host([raised]) { border-color: transparent; background: var(--raised); }
:host([compact]) { padding: 12px; }
.label {
  margin-block-end: 10px; color: var(--muted); font-size: var(--label-size); font-weight: var(--label-weight);
  font-stretch: var(--label-width); letter-spacing: var(--label-tracking); line-height: 1.3; text-transform: uppercase;
}
.label:empty { display: none; }`;

/**
 * `<gb-panel label="Rating">…</gb-panel>`: a flat box for a section of a page (brand.md, Depth).
 *
 * - `label`: a small uppercase heading over the content, for screen readers a heading at `level`
 *   (2 by default). Leave it off when the content has its own heading.
 * - `raised`: a box inside a panel (a tile, a list item): one surface step up, no line.
 * - `compact`: 12px padding instead of 16px, for dense content like tables and lists.
 */
export class GbPanel extends HTMLElement {
  static readonly observedAttributes = ["label", "level"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #label = document.createElement("div");

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#label.className = "label";
    this.#label.setAttribute("part", "label");
    this.#root.append(style, this.#label, document.createElement("slot"));
  }

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }

  set label(value: string) {
    if (value) this.setAttribute("label", value);
    else this.removeAttribute("label");
  }

  #render(): void {
    const label = this.label.trim();
    this.#label.textContent = label;
    // A role on an empty label would leave an empty heading for screen readers to land on.
    if (label) {
      const level = Number(this.getAttribute("level"));
      this.#label.setAttribute("role", "heading");
      this.#label.setAttribute(
        "aria-level",
        String(Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2),
      );
    } else {
      this.#label.removeAttribute("role");
      this.#label.removeAttribute("aria-level");
    }
  }
}

defineElement("gb-panel", GbPanel);
