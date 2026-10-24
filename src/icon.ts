import { defineElement } from "./define.js";
import { iconSvg, isIconName } from "./icons.js";

const styles = `:host { display: inline-block; flex: none; inline-size: 1.25em; block-size: 1.25em; vertical-align: -0.25em; }
svg { display: block; inline-size: 100%; block-size: 100%; overflow: visible; }`;

/**
 * `<gb-icon name="leaderboard" label="Leaderboard">`: an icon of the set (`icons.ts`). With a `label`
 * it's an image with that name for screen readers; without one it's decorative and hidden from them.
 * 1.25em by default, so it follows the text size; set `inline-size` and `block-size` to change it.
 * An unknown name draws nothing.
 */
export class GbIcon extends HTMLElement {
  static readonly observedAttributes = ["name", "label"];

  readonly #root = this.attachShadow({ mode: "open" });

  connectedCallback(): void {
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  #render(): void {
    const name = this.getAttribute("name") ?? "";
    const label = this.getAttribute("label")?.trim();
    // The name goes on the host, which is what a screen reader meets; the svg inside stays hidden.
    if (label) {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", label);
      this.removeAttribute("aria-hidden");
    } else {
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
      this.setAttribute("aria-hidden", "true");
    }
    this.#root.innerHTML = `<style>${styles}</style>${isIconName(name) ? iconSvg(name) : ""}`;
  }
}

defineElement("gb-icon", GbIcon);
