import "./chip.js";
import type { Tier } from "./chip.js";

/** The most suggestions the list shows (brand.md, Inputs). */
export const maxResults = 8;

/** One suggestion: a player, or whatever the app searches for. */
export interface SearchItem {
  /** What the query is matched against and what's shown, with the matching part in bold. */
  name: string;
  /** A tier chip after the name. */
  tier?: Tier;
  /** Small text after the name, like "was Kyoryu" for a match on an old name. */
  note?: string;
  /** Text at the end of the row, like a rating or a rank. */
  detail?: string;
  /** Where choosing the item goes. Without it, only the `pick` event tells the app. */
  href?: string;
}

/** What the `query` event carries. */
export interface SearchQuery {
  /** What was typed, trimmed. */
  query: string;
  /** Aborted when a newer query replaces this one or the box is cleared: pass it to `fetch`. */
  signal: AbortSignal;
  /** Shows the answer. Does nothing once the query is out of date, so a slow answer can't win. */
  answer: (items: readonly SearchItem[]) => void;
  /** Shows the error line instead (the default text when none is given). Same stale check. */
  fail: (message?: string) => void;
}

/** A row of the list: `item` with the first match of `query` (lower case) in its name in bold. */
export function optionRow(item: SearchItem, query: string): HTMLElement {
  const row = document.createElement(item.href ? "a" : "div");
  row.setAttribute("role", "option");
  if (item.href) row.setAttribute("href", item.href);
  const name = document.createElement("span");
  name.className = "gb-search-name";
  name.append(...highlight(item.name, query));
  if (item.note) {
    const note = document.createElement("small");
    note.textContent = item.note;
    name.append(note);
  }
  row.append(name);
  if (item.tier) {
    const chip = document.createElement("gb-chip");
    chip.setAttribute("tier", item.tier);
    chip.textContent = item.tier.charAt(0).toUpperCase() + item.tier.slice(1);
    row.append(chip);
  }
  if (item.detail) {
    const detail = document.createElement("span");
    detail.className = "gb-search-detail";
    detail.textContent = item.detail;
    row.append(detail);
  }
  return row;
}

/** `name` as text nodes with the first match of `query` in a `<b>`. Nothing is marked when none. */
function highlight(name: string, query: string): Node[] {
  const lower = name.toLowerCase();
  const at = query ? lower.indexOf(query) : -1;
  // Lower case can change a name's length (rare letters): then nothing is marked.
  if (at < 0 || lower.length !== name.length) return [document.createTextNode(name)];
  const end = at + query.length;
  const match = document.createElement("b");
  match.textContent = name.slice(at, end);
  return [
    document.createTextNode(name.slice(0, at)),
    match,
    document.createTextNode(name.slice(end)),
  ];
}
