import { tiers } from "./chip.js";
import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

// A picked chip says so three ways: its border and fill in its colour, its text in `fg`, and a check
// after the text, so it doesn't rest on colour alone (screen readers get `aria-pressed`, the ✓ has an
// empty alt). A tier chip's colour is its tier's, shown as a
// dot before the text either way; any other chip's is green.
const item = "gb-chip-select > button";
const styles = `gb-chip-select { display: flex; flex-wrap: wrap; gap: 6px; }
gb-chip-select[hidden] { display: none; }
${item} {
  --pick: var(--green);
  display: inline-flex; flex: none; align-items: center; gap: 6px; block-size: 32px; margin: 0; padding: 0 0.65rem;
  border: 1px solid var(--control-border); border-radius: var(--r); background: none; color: var(--soft);
  font: inherit; font-size: 0.82rem; font-weight: 600; line-height: 1; white-space: nowrap;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
${tiers.map((tier) => `${item}[tier="${tier}"] { --pick: var(--t-${tier}); }`).join("\n")}
${item}[tier]::before {
  content: ""; flex: none; inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--pick);
}
${item}:hover { color: var(--fg); }
${item}:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
${item}[aria-pressed="true"] {
  border-color: var(--pick); background: color-mix(in oklch, var(--pick) 14%, transparent); color: var(--fg);
}
${item}[aria-pressed="true"]::after { content: "✓" / ""; color: var(--pick); font-weight: 700; }
${item}:disabled { cursor: not-allowed; opacity: 0.5; }
@media (pointer: coarse) { ${item} { block-size: 40px; } }`;

const adoptStyles = lightStyles(styles);

/**
 * `<gb-chip-select label="Tier">`: any number of a handful of short options, all in view, such as
 * the tiers in a filter (brand.md, Inputs). The options are buttons:
 *
 * ```html
 * <gb-chip-select label="Tier" value="master,grandmaster">
 *   <button value="grandmaster" tier="grandmaster">Grandmaster</button>
 *   <button value="master" tier="master">Master</button>
 *   <button value="none">No tier</button>
 * </gb-chip-select>
 * ```
 *
 * - `label`: what is being picked, for screen readers.
 * - `tier` on an option: one of the tiers, shown in that tier's colour.
 * - Each option is a toggle button (`aria-pressed`), each in the tab order. `values` are the picked
 *   options' values (their `value` attribute, else their text) in the options' order; the `value`
 *   attribute holds them joined by commas. Picking or unpicking one fires `change` (not when the app
 *   sets them). A disabled option can't be toggled.
 */
export class GbChipSelect extends HTMLElement {
  static readonly observedAttributes = ["label", "value"];

  #observer: MutationObserver | undefined;

  constructor() {
    super();
    this.addEventListener("click", this.#onClick);
  }

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    this.#sync();
    this.#observer ??= new MutationObserver(() => {
      this.#sync();
    });
    this.#observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  /** The options, in order. */
  get options(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>(":scope > button")];
  }

  /** The picked options' values, in the options' order. */
  get values(): string[] {
    const wanted = this.#wanted();
    return this.options.map(valueOf).filter((value) => wanted.has(value));
  }

  set values(values: readonly string[]) {
    this.setAttribute("value", values.join(","));
  }

  #wanted(): Set<string> {
    const value = this.getAttribute("value");
    return new Set(value ? value.split(",") : []);
  }

  #sync(): void {
    const label = this.getAttribute("label");
    if (label) this.setAttribute("aria-label", label);
    else this.removeAttribute("aria-label");
    this.setAttribute("role", "group");

    const wanted = this.#wanted();
    for (const button of this.options) {
      button.type = "button";
      button.setAttribute("aria-pressed", String(wanted.has(valueOf(button))));
    }
  }

  readonly #onClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (button?.parentElement !== this || button.disabled) return;
    const value = valueOf(button);
    const picked = this.values;
    this.values = picked.includes(value)
      ? picked.filter((v) => v !== value)
      : this.options.map(valueOf).filter((v) => v === value || picked.includes(v));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };
}

function valueOf(button: HTMLButtonElement): string {
  return button.getAttribute("value") ?? button.textContent.trim();
}

defineElement("gb-chip-select", GbChipSelect);
