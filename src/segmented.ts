import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { itemStyles } from "./nav.js";

const styles = `gb-segmented {
  display: inline-flex; gap: 2px; padding: 3px; vertical-align: middle;
  border: 1px solid var(--control-border); border-radius: var(--r); background: var(--panel);
}
gb-segmented[hidden] { display: none; }
${itemStyles(
  "gb-segmented > :is(button, a)",
  ':is([aria-checked="true"], [aria-current]:not([aria-current="false"]))',
)}
/* The track already has the 6px corners; the options inside it step down to the small radius. */
gb-segmented > :is(button, a) { border-radius: var(--r-chip); }
gb-segmented > button:disabled { cursor: not-allowed; opacity: 0.5; }`;

const adoptStyles = lightStyles(styles);

/**
 * `<gb-segmented label="Region">`: one choice out of 2 to 4 short options, all in view (brand.md,
 * Inputs). The options are children, buttons or links:
 *
 * ```html
 * <gb-segmented label="View" value="rating">
 *   <button value="rating">Rating</button>
 *   <button value="places">Places</button>
 * </gb-segmented>
 *
 * <gb-segmented label="Region">
 *   <a href="?region=eu" aria-current="true">EU</a>
 *   <a href="?region=na">NA</a>
 * </gb-segmented>
 * ```
 *
 * - `label`: what is being chosen, for screen readers.
 * - Buttons are a radio group. `value` is the chosen option's value (its `value` attribute, else
 *   its text); the first enabled option when it matches none. Picking one sets `value` and fires
 *   `change` (not when the app sets it). The arrow keys move the choice, wrapping round, and Tab
 *   goes on to whatever follows. A disabled button is skipped.
 * - Links are for a choice that is a page, such as the region switch. The page marks the chosen one
 *   `aria-current="true"`; picking one is a plain navigation. The group is announced as a group,
 *   and Tab reaches every link, as with `<gb-nav>`.
 */
export class GbSegmented extends HTMLElement {
  static readonly observedAttributes = ["label", "value"];

  // Options can arrive after the element is defined (while the page is parsed) or be added later.
  #observer: MutationObserver | undefined;

  constructor() {
    super();
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
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

  /** The chosen button's value; empty for links, which the page marks itself. */
  get value(): string {
    const chosen = this.#chosen();
    return chosen ? valueOf(chosen) : "";
  }

  set value(value: string) {
    this.setAttribute("value", value);
  }

  /** The options, in order. */
  get options(): (HTMLButtonElement | HTMLAnchorElement)[] {
    return [
      ...this.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(":scope > :is(button, a)"),
    ];
  }

  get #buttons(): HTMLButtonElement[] {
    return this.options.filter((option) => option instanceof HTMLButtonElement);
  }

  #chosen(): HTMLButtonElement | undefined {
    const enabled = this.#buttons.filter((button) => !button.disabled);
    const wanted = this.getAttribute("value");
    return enabled.find((button) => valueOf(button) === wanted) ?? enabled[0];
  }

  #sync(): void {
    const label = this.getAttribute("label");
    if (label) this.setAttribute("aria-label", label);
    else this.removeAttribute("aria-label");

    const buttons = this.#buttons;
    this.setAttribute("role", buttons.length ? "radiogroup" : "group");
    const chosen = this.#chosen();
    for (const button of buttons) {
      const isChosen = button === chosen;
      button.type = "button";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(isChosen));
      // Roving focus: only the chosen option is in the tab order; the arrow keys reach the others.
      button.tabIndex = isChosen ? 0 : -1;
    }
  }

  /** Chooses `button` because the user picked it, focuses it and fires `change`. */
  #pick(button: HTMLButtonElement): void {
    if (button.disabled) return;
    button.focus();
    const value = valueOf(button);
    if (value === this.value) return;
    this.value = value;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  readonly #onClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (button?.parentElement === this) this.#pick(button);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const enabled = this.#buttons.filter((button) => !button.disabled);
    const current = enabled.findIndex((button) => button === event.target);
    if (current < 0) return;
    // In a right-to-left page the options run the other way, and so do the left and right arrows.
    const rtl = getComputedStyle(this).direction === "rtl";
    const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const back = event.key === "ArrowUp" || event.key === (rtl ? "ArrowRight" : "ArrowLeft");
    if (!forward && !back) return;
    event.preventDefault();
    const next = enabled[(current + (forward ? 1 : -1) + enabled.length) % enabled.length];
    if (next) this.#pick(next);
  };
}

function valueOf(button: HTMLButtonElement): string {
  return button.getAttribute("value") ?? button.textContent.trim();
}

defineElement("gb-segmented", GbSegmented);
