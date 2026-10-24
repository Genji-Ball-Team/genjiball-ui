import { tiers } from "./chip.js";
import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

// The rims turn by animating an angle, which only works once the browser knows it is one.
try {
  CSS.registerProperty({
    name: "--gb-spin",
    syntax: "<angle>",
    inherits: false,
    initialValue: "0deg",
  });
} catch {
  // Already registered by another copy of the library, or a browser (or test DOM) without it.
}

const god = 'tr[data-title="god"]';
const demi = 'tr[data-title="demigod"]';
const name = "td:nth-child(2) > :is(a, span):first-child";

// The brand sheet's leaderboard. The table is a grid so every row can be its own rounded box, with
// subgrid keeping the columns lined up from row to row. A table laid out as a grid loses its table
// semantics in some browsers, so the element gives every part its role back.
const styles = `gb-leaderboard { display: block; container-type: inline-size; }
gb-leaderboard[hidden] { display: none; }
gb-leaderboard > table {
  position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto; column-gap: 8px;
  inline-size: 100%; border-spacing: 0; font-size: 0.86rem; font-variant-numeric: tabular-nums;
}
gb-leaderboard > table > :is(thead, tbody), gb-leaderboard tr {
  display: grid; grid-column: 1 / -1; grid-template-columns: subgrid;
}
/* The columns speak for themselves on screen; screen readers still get the headers. */
gb-leaderboard > table > thead {
  position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
gb-leaderboard tbody > tr {
  --gb-tier: transparent; --gb-fill: transparent;
  position: relative; align-items: center; block-size: 36px; padding: 0 0.6rem 0 0.8rem;
  border: 1.5px solid transparent; border-radius: var(--r); background: var(--gb-fill);
}
gb-leaderboard tbody > tr:nth-child(even) { --gb-fill: var(--raised); }
${tiers.map((tier) => `gb-leaderboard tr[data-tier="${tier}"] { --gb-tier: var(--t-${tier}); }`).join("\n")}
/* The tier bar: tier colour shows on the chip and here, never on text. */
gb-leaderboard tbody > tr::before {
  content: ""; position: absolute; inset-inline-start: 3px; inset-block: 9px; inline-size: 3px; border-radius: 2px;
  background: var(--gb-tier);
}
gb-leaderboard td { min-inline-size: 0; padding: 0; white-space: nowrap; }
gb-leaderboard td:nth-child(1) { color: var(--muted); font-weight: 700; font-stretch: 75%; text-align: end; }
gb-leaderboard td:nth-child(2) { display: flex; align-items: center; gap: 7px; overflow: hidden; }
gb-leaderboard ${name} { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; }
gb-leaderboard td:nth-child(2) > a { color: var(--fg); text-decoration: none; border-radius: var(--r-chip); }
gb-leaderboard td:nth-child(2) > a:hover { text-decoration: underline; text-underline-offset: 2px; }
gb-leaderboard td:nth-child(2) > a:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
/* A focus ring on the name would be cut off by the cell clipping a long name, so the cell lets it show. */
gb-leaderboard td:nth-child(2):has(> a:focus-visible) { overflow: visible; }
gb-leaderboard td:nth-child(n + 4) { text-align: end; }
gb-leaderboard td:nth-child(4) { font-weight: 700; }

/* God: white light. A white rim runs round the row, the place and rating glow, the name shimmers. */
gb-leaderboard ${god} {
  --gb-fill: var(--panel); margin-block: 2px 4px; isolation: isolate;
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--god-cream) 14%, transparent), transparent 80%) padding-box,
    linear-gradient(var(--gb-fill), var(--gb-fill)) padding-box,
    conic-gradient(from var(--gb-spin), var(--line) 0 55%, var(--god) 72%, var(--god-rim) 80%, var(--line) 92% 100%) border-box;
  box-shadow: 0 0 18px color-mix(in oklab, var(--god-cream) 12%, transparent);
  animation: gb-spin 4s linear infinite;
}
gb-leaderboard ${god}::before {
  background: linear-gradient(var(--god-cream), var(--god));
  box-shadow: 0 0 8px color-mix(in oklab, var(--god-cream) 90%, transparent);
}
gb-leaderboard ${god} > :is(td:nth-child(1), td:nth-child(4)) {
  color: var(--god); text-shadow: 0 0 12px color-mix(in oklab, var(--god-rim) 80%, transparent);
}
gb-leaderboard ${god} > ${name} {
  font-weight: 650; color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(110deg, var(--god) 0 35%, var(--god-rim) 45%, var(--god) 50%, var(--god-cream) 55%, var(--god) 65% 100%);
  background-size: 200% 100%; animation: gb-shimmer 3s linear infinite;
}

/* Demigod: dark red. A slower red rim turns the other way over a red haze. */
gb-leaderboard ${demi} {
  --gb-fill: color-mix(in oklab, var(--demi-dark) 17%, var(--bg)); margin-block: 2px;
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--demi) 14%, transparent), transparent 70%) padding-box,
    linear-gradient(var(--gb-fill), var(--gb-fill)) padding-box,
    conic-gradient(from var(--gb-spin), var(--demi-dark) 0 35%, var(--demi) 45%, var(--demi-hi) 50%, var(--demi-dark) 60% 85%, var(--demi-deep) 92%, var(--demi-dark) 100%) border-box;
  animation: gb-spin 7s linear infinite reverse;
}
gb-leaderboard ${demi}::before {
  background: linear-gradient(var(--demi-hi), var(--demi));
  box-shadow: 0 0 8px color-mix(in oklab, var(--demi-hi) 75%, transparent);
}

@keyframes gb-spin { to { --gb-spin: 360deg; } }
@keyframes gb-shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
  gb-leaderboard :is(${god}, ${demi}), gb-leaderboard ${god} > ${name} { animation: none; }
}
@media (pointer: coarse) { gb-leaderboard tbody > tr { block-size: 40px; } }

/* Narrow (a phone): the tier chip goes under the name, so a name with a title still fits. */
@container (max-width: 440px) {
  gb-leaderboard > table { grid-template-columns: auto minmax(0, 1fr) auto auto; }
  gb-leaderboard tbody > tr { block-size: auto; min-block-size: 48px; padding-block: 6px; row-gap: 4px; }
  gb-leaderboard tbody > tr > td { grid-row: 1 / span 2; }
  gb-leaderboard tbody > tr > td:nth-child(2) { grid-area: 1 / 2; }
  gb-leaderboard tbody > tr > td:nth-child(3) { grid-area: 2 / 2; line-height: 1; }
  gb-leaderboard tbody > tr > td:nth-child(4) { grid-column: 3; }
  gb-leaderboard tbody > tr > td:nth-child(5) { grid-column: 4; }
}`;

const adoptStyles = lightStyles(styles);

const roles: [selector: string, role: string][] = [
  [":scope > table", "table"],
  [":scope > table > :is(thead, tbody)", "rowgroup"],
  [":scope > table > * > tr", "row"],
  [":scope > table > thead > tr > th", "columnheader"],
  [":scope > table > tbody > tr > td", "cell"],
];

/**
 * `<gb-leaderboard>`: the ranked leaderboard. Wrap a `<table>` with five columns, place, player,
 * tier, rating and change, one row per player:
 *
 * ```html
 * <gb-leaderboard>
 *   <table>
 *     <thead><tr><th>Place</th><th>Player</th><th>Tier</th><th>Rating</th><th>Change</th></tr></thead>
 *     <tbody>
 *       <tr data-tier="sovereign" data-title="god">
 *         <td>1</td>
 *         <td><a href="/player/kyoryu">Kyoryu</a> <gb-chip title-chip="god">God</gb-chip></td>
 *         <td><gb-chip tier="sovereign">Sovereign</gb-chip></td>
 *         <td>2,871</td>
 *         <td><gb-delta value="24"></gb-delta></td>
 *       </tr>
 *     </tbody>
 *   </table>
 * </gb-leaderboard>
 * ```
 *
 * - `data-tier` on a row: the tier bar's colour, one of the {@link tiers}.
 * - `data-title` on a row: `god` or `demigod`, the title rows from the brand sheet. They are the only
 *   rows that move, and stand still under reduced motion.
 * - The player's name goes first in its cell, in an `<a>` or a `<span>`, so a long one can be cut
 *   short and the God name can shimmer. A title chip goes after it.
 *
 * In a box narrower than 440px the tier chip moves under the name. The header row is for screen
 * readers only. Rows added later get the same treatment.
 */
export class GbLeaderboard extends HTMLElement {
  #observer: MutationObserver | undefined;

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    this.#sync();
    this.#observer ??= new MutationObserver(() => {
      this.#sync();
    });
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }

  #sync(): void {
    for (const [selector, role] of roles)
      for (const element of this.querySelectorAll(selector))
        if (element.getAttribute("role") !== role) element.setAttribute("role", role);
    this.#observer?.takeRecords();
  }
}

defineElement("gb-leaderboard", GbLeaderboard);
