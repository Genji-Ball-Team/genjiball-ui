import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

const styles = `gb-form-row { display: block; }
gb-form-row[hidden] { display: none; }
gb-form-row > ul { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
gb-form-row a {
  display: grid; place-items: center; inline-size: 24px; block-size: 24px; border-radius: var(--r-chip);
  background: var(--raised); color: var(--soft); font-size: 0.78rem; font-weight: 600; line-height: 1;
  font-variant-numeric: tabular-nums; text-decoration: none; -webkit-tap-highlight-color: transparent;
}
gb-form-row a:hover { background: var(--line); color: var(--fg); }
gb-form-row a:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
/* A win is filled with up and has dark text; the number says the place either way. */
gb-form-row a[data-won] { background: var(--up); color: var(--bg); font-weight: 700; }
gb-form-row a[data-won]:hover { background: color-mix(in oklch, var(--up) 80%, var(--fg)); color: var(--bg); }
gb-form-row > p { margin: 0; color: var(--muted); font-size: var(--body-size); }
/* Tap targets on phones and tablets: at least 40px. */
@media (pointer: coarse) { gb-form-row a { inline-size: 40px; block-size: 40px; font-size: 0.9rem; } }`;

const adoptStyles = lightStyles(styles);

/** One round in the row. */
export interface FormResult {
  /** The place in the round, from 1; 1 is a win. */
  place: number;
  /** How many players were in it. */
  players: number;
  /** The round's match. */
  href: string;
  /** The full label, e.g. "Won round 3 of match #812". Left off, it is "Won" or "3rd of 6". */
  label?: string;
}

const suffixes = ["th", "st", "nd", "rd"];

function ordinal(n: number): string {
  const tail = n % 100;
  return `${n}${suffixes[(tail - 20) % 10] ?? suffixes[tail] ?? "th"}`;
}

/**
 * `<gb-form-row label="Recent form">`: a player's last rounds as a row of small squares (brand.md,
 * Players). Set `results` to the rounds, oldest first, so the row reads like the rating chart.
 *
 * ```js
 * row.results = [{ place: 3, players: 6, href: "/match?id=811", label: "3rd of 6, round 2 of match #811" }];
 * ```
 *
 * - Each square shows the place as a tabular number and is a link to its match, with `label` as its
 *   name for screen readers and as its tooltip. A win (place 1) is filled with `up` and has dark
 *   text; the others are on `raised`. The number carries the meaning, so colour is never the only cue.
 * - `label`: what the row is, for screen readers; "Recent form" by default.
 * - `empty`: the muted line shown when there are no results; "No matches yet." by default.
 */
export class GbFormRow extends HTMLElement {
  static readonly observedAttributes = ["label", "empty"];

  #results: FormResult[] = [];

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render();
  }

  /** The rounds to show, oldest first. */
  get results(): FormResult[] {
    return this.#results;
  }

  set results(value: FormResult[]) {
    this.#results = value;
    if (this.isConnected) this.#render();
  }

  #render(): void {
    if (!this.#results.length) {
      const empty = document.createElement("p");
      empty.textContent = this.getAttribute("empty") ?? "No matches yet.";
      this.replaceChildren(empty);
      return;
    }
    const list = document.createElement("ul");
    list.setAttribute("aria-label", this.getAttribute("label") ?? "Recent form");
    for (const result of this.#results) {
      const won = result.place === 1;
      const name = result.label ?? (won ? "Won" : `${ordinal(result.place)} of ${result.players}`);
      const link = document.createElement("a");
      link.href = result.href;
      link.textContent = String(result.place);
      link.setAttribute("aria-label", name);
      link.title = name;
      link.toggleAttribute("data-won", won);
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
    }
    this.replaceChildren(list);
  }
}

defineElement("gb-form-row", GbFormRow);
