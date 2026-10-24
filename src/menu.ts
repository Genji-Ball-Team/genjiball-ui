import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { AnchoredOverlay } from "./overlay.js";

// Items are text rows, 32px (40px on touch screens); the hovered or focused one sits on `line`.
// Danger items are `down` and come last, after a divider.
const styles = `gb-menu { display: inline-block; vertical-align: middle; }
gb-menu[hidden] { display: none; }
gb-menu > .gb-overlay-panel { display: flex; flex-direction: column; min-inline-size: 180px; padding: 4px; }
gb-menu > .gb-overlay-panel:focus-visible { outline: none; }
gb-menu > .gb-overlay-panel > :is(button, a) {
  display: flex; align-items: center; gap: 8px; flex: none; block-size: 32px; margin: 0; padding: 0 10px;
  border: 0; border-radius: calc(var(--r) - 2px); background: none; color: var(--fg);
  font: inherit; font-size: 0.84rem; line-height: 1; text-align: start; text-decoration: none; white-space: nowrap;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
gb-menu > .gb-overlay-panel > :is(button, a) > gb-icon { inline-size: 18px; block-size: 18px; color: var(--soft); }
gb-menu > .gb-overlay-panel > :is(button, a):is(:hover, :focus) { background: var(--line); outline: none; }
gb-menu > .gb-overlay-panel > :is(button, a):focus-visible { outline: 2px solid var(--green); outline-offset: -2px; }
gb-menu > .gb-overlay-panel > [data-danger], gb-menu > .gb-overlay-panel > [data-danger] > gb-icon { color: var(--down); }
gb-menu > .gb-overlay-panel > :is(:disabled, [aria-disabled="true"]) { cursor: not-allowed; opacity: 0.5; background: none; }
gb-menu > .gb-overlay-panel > hr { flex: none; block-size: 1px; margin: 4px 0; border: 0; background: var(--border); }
@media (pointer: coarse) { gb-menu > .gb-overlay-panel > :is(button, a) { block-size: 40px; } }`;

const adopt = lightStyles(styles);

/**
 * `<gb-menu label="Match actions">`: a short list of actions that a button opens (brand.md,
 * Overlays). Two children: the button, then a box of `<button>` or `<a href>` items, with an `<hr>`
 * before the destructive ones. `data-danger` makes an item orange.
 *
 * ```html
 * <gb-menu label="Match actions">
 *   <gb-button variant="ghost" aria-label="More actions">⋯</gb-button>
 *   <div>
 *     <button>Copy match link</button>
 *     <a href="/admin/matches/412">Open in admin</a>
 *     <hr />
 *     <button data-danger>Delete match</button>
 *   </div>
 * </gb-menu>
 * ```
 *
 * - `label`: what the menu is, for screen readers. Without it, the button's text names it.
 * - Click, Enter, Space or ↓ on the button opens it on the first item; ↑ opens it on the last.
 * - ↑ and ↓ move through the items (round the end), Home and End go to the first and last, and a
 *   letter goes to the next item starting with it. Disabled items are skipped.
 * - Enter or a click runs the item: its own click listener does the work, then the menu fires
 *   `select` (with the item as `detail`), closes and puts focus back on the button.
 * - Escape closes it the same way; Tab and a click outside close it and leave focus where it went.
 */
export class GbMenu extends AnchoredOverlay {
  static readonly observedAttributes = ["label"];
  protected override readonly popupRole = "menu";
  #startAtEnd = false;

  constructor() {
    super();
    this.addEventListener("keydown", this.#onTriggerKeydown);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync();
  }

  /** The menu's items, in order. */
  get items(): HTMLElement[] {
    const panel = this.panel;
    if (!panel) return [];
    return [...panel.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLButtonElement ||
        (child instanceof HTMLAnchorElement && child.hasAttribute("href")),
    );
  }

  protected override adoptStyles(root: Node): void {
    adopt(root);
  }

  protected override sync(): void {
    super.sync();
    const { trigger, panel } = this;
    if (!trigger || !panel) return;
    panel.setAttribute("role", "menu");
    const label = this.getAttribute("label");
    if (label) {
      panel.setAttribute("aria-label", label);
      panel.removeAttribute("aria-labelledby");
    } else {
      trigger.id ||= `${this.overlayId}-button`;
      panel.setAttribute("aria-labelledby", trigger.id);
      panel.removeAttribute("aria-label");
    }
    for (const child of panel.children) {
      if (child instanceof HTMLHRElement) child.setAttribute("role", "separator");
    }
    for (const item of this.items) {
      item.setAttribute("role", "menuitem");
      // The arrow keys move between items; Tab leaves the menu.
      item.tabIndex = -1;
      if (item instanceof HTMLButtonElement) item.type = "button";
    }
  }

  protected override focusPanel(panel: HTMLElement): void {
    const usable = this.#usable();
    const item = this.#startAtEnd ? usable.at(-1) : usable[0];
    this.#startAtEnd = false;
    (item ?? panel).focus();
  }

  protected override panelClick(event: MouseEvent): void {
    const item = this.items.find(
      (one) => event.target instanceof Node && one.contains(event.target),
    );
    if (!item || !isUsable(item)) return;
    this.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: item }));
    this.hide();
  }

  protected override panelKeydown(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    const usable = this.#usable();
    const active = document.activeElement;
    const current = usable.findIndex((item) => item === active);
    if (event.key === "Tab") {
      this.hide(false);
      return false;
    }
    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = usable[(current + 1) % usable.length];
    else if (event.key === "ArrowUp")
      next =
        usable[current < 0 ? usable.length - 1 : (current - 1 + usable.length) % usable.length];
    else if (event.key === "Home") next = usable[0];
    else if (event.key === "End") next = usable.at(-1);
    else if (event.key.length === 1 && event.key.trim())
      next = this.#byLetter(usable, current, event.key);
    else return false;
    next?.focus();
    return true;
  }

  #usable(): HTMLElement[] {
    return this.items.filter(isUsable);
  }

  /** The next item after `current` whose text starts with `letter`, going round the end. */
  #byLetter(usable: HTMLElement[], current: number, letter: string): HTMLElement | undefined {
    const wanted = letter.toLocaleLowerCase();
    for (let step = 1; step <= usable.length; step++) {
      const item = usable[(current + step) % usable.length];
      if (item?.textContent.trim().toLocaleLowerCase().startsWith(wanted)) return item;
    }
    return undefined;
  }

  readonly #onTriggerKeydown = (event: KeyboardEvent): void => {
    const target = event.target instanceof Node ? event.target : null;
    if (this.open || !target || !this.trigger?.contains(target)) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    this.#startAtEnd = event.key === "ArrowUp";
    this.show();
  };
}

const isUsable = (item: HTMLElement) =>
  !(item instanceof HTMLButtonElement && item.disabled) &&
  item.getAttribute("aria-disabled") !== "true";

defineElement("gb-menu", GbMenu);
