import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

/**
 * The brand sheet's nav item, shared with the tabs: muted text, and the active one on `raised` in
 * full text colour with its icon in green. An item without an icon gets a short green bar instead,
 * so green always marks the active item. `active` is the selector for the active state.
 */
export function itemStyles(item: string, active: string): string {
  return `${item} {
  position: relative; display: inline-flex; flex: none; align-items: center; gap: 6px; block-size: 32px; margin: 0;
  padding: 0 0.65rem; border: 0; border-radius: var(--r); background: none; color: var(--muted);
  font: inherit; font-size: 0.82rem; font-weight: 550; line-height: 1; text-decoration: none; white-space: nowrap;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
${item}:hover { color: var(--soft); }
${item}:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
${item} > gb-icon { inline-size: 18px; block-size: 18px; }
${item}${active} { background: var(--raised); color: var(--fg); }
${item}${active} > gb-icon { color: var(--green); }
${item}${active}:not(:has(> gb-icon))::after {
  content: ""; position: absolute; inset-inline: 0.65rem; inset-block-end: 4px; block-size: 2px;
  border-radius: 1px; background: var(--green);
}
@media (pointer: coarse) { ${item} { block-size: 40px; } }`;
}

/**
 * One row that scrolls sideways on a narrow screen rather than wrapping, so the items stay in
 * reading order and the page below doesn't move. A scrolling box clips what's outside it, so 4px of
 * padding (taken back with a negative margin) keeps the focus ring whole.
 */
export const rowStyles =
  "display: flex; gap: 4px; margin: -4px; padding: 4px; overflow-x: auto; scrollbar-width: none;";

const styles = `gb-nav { ${rowStyles} }
gb-nav[hidden] { display: none; }
gb-nav::-webkit-scrollbar { display: none; }
${itemStyles("gb-nav > a", '[aria-current]:not([aria-current="false"])')}`;

const adoptStyles = lightStyles(styles);

/**
 * `<gb-nav aria-label="Main">`: links between pages, each an `<a>` child, optionally with a
 * `<gb-icon>` before its text. Mark the current page's link `aria-current="page"`: it shows as
 * active, with a green icon.
 *
 * The links stay plain links in the page, so they work before the script loads and with any router.
 * The nav is a navigation landmark; give it an `aria-label` when the page has more than one. For
 * sections within a page, use `<gb-tabs>`.
 */
export class GbNav extends HTMLElement {
  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    if (!this.hasAttribute("role")) this.setAttribute("role", "navigation");
    requestAnimationFrame(() => {
      this.revealCurrent();
    });
  }

  /**
   * Scrolls the row sideways so the current page's link is in view, when the links don't all fit.
   * Done on connect; call it again after changing `aria-current` in place.
   */
  revealCurrent(): void {
    const current = this.querySelector(':scope > a[aria-current]:not([aria-current="false"])');
    if (!current || this.scrollWidth <= this.clientWidth) return;
    const row = this.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    // A little of the next link stays visible, so the row reads as one that scrolls.
    if (item.left < row.left) this.scrollLeft += item.left - row.left - 24;
    else if (item.right > row.right) this.scrollLeft += item.right - row.right + 24;
  }
}

defineElement("gb-nav", GbNav);
