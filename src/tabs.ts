import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { itemStyles, rowStyles } from "./nav.js";

const styles = `gb-tabs { display: block; }
gb-tabs[hidden] { display: none; }
.gb-tabs-list { ${rowStyles} }
.gb-tabs-list::-webkit-scrollbar { display: none; }
gb-tabs > [role="tabpanel"] { margin-block-start: 16px; }
/* An app rule giving the panel a display would otherwise show the hidden ones too. */
gb-tabs > [role="tabpanel"][hidden] { display: none; }
gb-tabs > [role="tabpanel"]:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; border-radius: var(--r); }
${itemStyles(".gb-tabs-list > button", '[aria-selected="true"]')}
.gb-tabs-list > button:disabled { cursor: not-allowed; opacity: 0.5; }`;

const adoptStyles = lightStyles(styles);

let nextId = 0;

/**
 * `<gb-tabs label="Player stats">`: sections of one page, one shown at a time. Each `<button>`
 * child is a tab and each other child its panel, in the same order:
 *
 * ```html
 * <gb-tabs label="Player stats">
 *   <button>Overview</button>
 *   <button>Matches</button>
 *   <section>…</section>
 *   <section>…</section>
 * </gb-tabs>
 * ```
 *
 * - `label`: what the tabs are, for screen readers.
 * - `selected`: the shown tab's index, 0 by default. Changes when a tab is picked, and the tabs fire
 *   `change` then (not when the app sets it).
 *
 * The keyboard moves between tabs with the arrow keys, Home and End, and Tab goes on to the panel.
 * A disabled button is skipped. For links between pages, use `<gb-nav>`.
 */
export class GbTabs extends HTMLElement {
  static readonly observedAttributes = ["label", "selected"];

  readonly #id = `gb-tabs-${nextId++}`;
  readonly #list = document.createElement("div");
  // Buttons and panels can arrive after the element is defined (while the page is parsed) or be
  // added later, so the tabs follow their children.
  #observer: MutationObserver | undefined;

  constructor() {
    super();
    this.#list.className = "gb-tabs-list";
    this.#list.setAttribute("role", "tablist");
    this.#list.addEventListener("click", this.#onClick);
    this.#list.addEventListener("keydown", this.#onKeydown);
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

  get selected(): number {
    const value = Number(this.getAttribute("selected"));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }

  set selected(value: number) {
    this.setAttribute("selected", String(value));
  }

  /** The tab buttons, in order. */
  get tabs(): HTMLButtonElement[] {
    return [...this.#list.querySelectorAll<HTMLButtonElement>(":scope > button")];
  }

  /** The panels, in the same order as the tabs. */
  get panels(): HTMLElement[] {
    return [...this.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== this.#list,
    );
  }

  #sync(): void {
    // New buttons go into the tab list, after the ones already there.
    const added = [...this.children].filter((child) => child instanceof HTMLButtonElement);
    this.#list.append(...added);
    if (this.firstElementChild !== this.#list) this.prepend(this.#list);
    this.#observer?.takeRecords();

    const label = this.getAttribute("label");
    if (label) this.#list.setAttribute("aria-label", label);
    else this.#list.removeAttribute("aria-label");

    const tabs = this.tabs;
    const panels = this.panels;
    const selected = Math.min(this.selected, Math.max(tabs.length - 1, 0));
    tabs.forEach((tab, index) => {
      const panel = panels[index];
      const isSelected = index === selected;
      tab.type = "button";
      tab.id ||= `${this.#id}-tab-${index}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(isSelected));
      // Roving focus: only the shown tab is in the tab order; the arrow keys reach the others.
      tab.tabIndex = isSelected ? 0 : -1;
      if (panel) {
        panel.id ||= `${this.#id}-panel-${index}`;
        tab.setAttribute("aria-controls", panel.id);
      } else tab.removeAttribute("aria-controls");
    });
    panels.forEach((panel, index) => {
      const tab = tabs[index];
      panel.setAttribute("role", "tabpanel");
      // Focusable, so Tab goes from the tabs to the panel even when it starts with plain text.
      panel.tabIndex = 0;
      if (tab) panel.setAttribute("aria-labelledby", tab.id);
      panel.hidden = index !== selected;
    });
  }

  /** Shows tab `index` because the user picked it, focuses it and fires `change`. */
  #pick(index: number): void {
    const tab = this.tabs[index];
    if (!tab || tab.disabled) return;
    tab.focus();
    if (index === this.selected) return;
    this.selected = index;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  readonly #onClick = (event: MouseEvent): void => {
    const tab = event.target instanceof Element ? event.target.closest("button") : null;
    if (tab?.parentElement === this.#list) this.#pick(this.tabs.indexOf(tab));
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tabs = this.tabs;
    const enabled = tabs.filter((tab) => !tab.disabled);
    const current = enabled.findIndex((tab) => tab === event.target);
    if (current < 0) return;
    // In a right-to-left page the tabs run the other way, and so do the arrows.
    const forward = getComputedStyle(this.#list).direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = forward === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    let next: number;
    if (event.key === forward) next = (current + 1) % enabled.length;
    else if (event.key === back) next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    else return;
    event.preventDefault();
    const tab = enabled[next];
    if (tab) this.#pick(tabs.indexOf(tab));
  };
}

defineElement("gb-tabs", GbTabs);
