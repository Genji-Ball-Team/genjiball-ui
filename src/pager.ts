import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

// The ghost button's look (brand.md, Buttons) on a link. A hidden end keeps its space.
const styles = `gb-pager { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
gb-pager[hidden], gb-pager:empty { display: none; }
gb-pager > a {
  display: inline-flex; align-items: center; gap: 6px; block-size: 36px; padding: 0 8px; border-radius: var(--r);
  color: var(--soft); font-size: 0.84rem; font-weight: 650; line-height: 1; text-decoration: none; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
gb-pager > a:hover { color: var(--fg); }
gb-pager > a:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
gb-pager > a[rel="next"] { justify-self: end; }
/* Out of sight and out of the tab order, but still taking its space, so nothing moves. */
gb-pager > a[hidden] { display: inline-flex; visibility: hidden; }
gb-pager > span { color: var(--muted); font-size: 0.84rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (pointer: coarse) { gb-pager > a { block-size: 40px; } }`;

const adoptStyles = lightStyles(styles);

/**
 * `<gb-pager page="2" pages="9" href="/matches?page={page}">`: "← Previous" and "Next →" at the two
 * ends of a list, with "Page 2 of 9" between them (brand.md, Inputs).
 *
 * - `href`: the URL of a page, with `{page}` where its number goes. Every page is a plain link, so
 *   paging works before the script loads, with any router and in a new tab.
 * - `page`: the current page, from 1. Clamped to `pages` when that is set.
 * - `pages`: how many pages there are. Leave it off when the server only knows whether another
 *   page follows: the text is then "Page 2", and `more` shows the next link.
 * - `more`: another page follows (only read when `pages` is off).
 *
 * The link that can't go anywhere (Previous on page 1, Next on the last page) is hidden but keeps
 * its space. With a single page the pager shows nothing. It is a navigation landmark labelled
 * "Pages"; set `aria-label` when a page has more than one.
 */
export class GbPager extends HTMLElement {
  static readonly observedAttributes = ["page", "pages", "more", "href"];

  readonly #prev = document.createElement("a");
  readonly #label = document.createElement("span");
  readonly #next = document.createElement("a");

  constructor() {
    super();
    this.#prev.rel = "prev";
    this.#next.rel = "next";
    // The arrows are decoration: the links are named by their words.
    this.#prev.innerHTML = `<span aria-hidden="true">←</span>Previous`;
    this.#next.innerHTML = `Next<span aria-hidden="true">→</span>`;
  }

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    if (!this.hasAttribute("role")) this.setAttribute("role", "navigation");
    if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", "Pages");
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  get page(): number {
    const value = Number(this.getAttribute("page"));
    const page = Number.isInteger(value) && value >= 1 ? value : 1;
    return this.pages ? Math.min(page, this.pages) : page;
  }

  set page(value: number) {
    this.setAttribute("page", String(value));
  }

  /** How many pages there are; 0 when not known. */
  get pages(): number {
    const value = Number(this.getAttribute("pages"));
    return Number.isInteger(value) && value >= 1 ? value : 0;
  }

  set pages(value: number) {
    this.setAttribute("pages", String(value));
  }

  /** The URL of page `page`, from the `href` template. */
  url(page: number): string {
    return (this.getAttribute("href") ?? "").replaceAll("{page}", String(page));
  }

  #render(): void {
    const { page, pages } = this;
    const hasNext = pages ? page < pages : this.hasAttribute("more");
    if (page <= 1 && !hasNext) {
      this.replaceChildren();
      return;
    }
    this.#prev.hidden = page <= 1;
    this.#next.hidden = !hasNext;
    this.#prev.href = this.url(page - 1);
    this.#next.href = this.url(page + 1);
    this.#label.textContent = pages ? `Page ${page} of ${pages}` : `Page ${page}`;
    this.replaceChildren(this.#prev, this.#label, this.#next);
  }
}

defineElement("gb-pager", GbPager);
