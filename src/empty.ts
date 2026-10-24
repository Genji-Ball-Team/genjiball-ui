import { defineElement } from "./define.js";

// One muted line, centred in the space the content would fill, and the action under it if any.
const styles = `:host {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  padding: 24px 16px; color: var(--muted); font-size: var(--body-size); line-height: 1.45; text-align: center;
}
:host([hidden]) { display: none; }`;

/**
 * `<gb-empty>No matches yet.</gb-empty>`: what's missing where a list, table or chart would be
 * (brand.md, Empty states). One plain line, no illustration and no second line explaining it.
 *
 * Put an optional next step in the `action` slot:
 * `<gb-button slot="action">Host a ranked lobby</gb-button>`, or a link.
 */
export class GbEmpty extends HTMLElement {
  readonly #root = this.attachShadow({ mode: "open" });

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    const action = document.createElement("slot");
    action.name = "action";
    this.#root.append(style, document.createElement("slot"), action);
  }
}

defineElement("gb-empty", GbEmpty);
