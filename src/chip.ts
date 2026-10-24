import { defineElement } from "./define.js";

export type Tier =
  "rookie" | "apprentice" | "master" | "grandmaster" | "ascendant" | "champion" | "sovereign";

export type ChipTitle = "god" | "demigod";

/** The rank tiers, lowest first. Their colours are the `t-` tokens. */
export const tiers: readonly Tier[] = [
  "rookie",
  "apprentice",
  "master",
  "grandmaster",
  "ascendant",
  "champion",
  "sovereign",
];

const titles: readonly ChipTitle[] = ["god", "demigod"];

// The host is the chip; the text stays in the page, so it shows before the element upgrades and is
// what screen readers and search read. A tier chip is the tier colour on 16% of itself, the one
// place tier colour goes besides the row's side bar. A plain chip (a region) is grey: regions have
// no colours. The title chips are the brand sheet's: a light band sweeps across them, and God glows.
const styles = `:host {
  --chip: var(--soft);
  display: inline-block; vertical-align: middle; padding: 0.1rem 0.42rem; border-radius: var(--r-chip);
  color: var(--chip); background: color-mix(in oklch, var(--chip) 16%, transparent);
  font-size: 0.6rem; font-weight: 800; line-height: 1.45; letter-spacing: 0.1em;
  text-transform: uppercase; white-space: nowrap;
}
:host([hidden]) { display: none; }
${tiers.map((tier) => `:host([tier="${tier}"]) { --chip: var(--t-${tier}); }`).join("\n")}

:host([title-chip]) {
  padding: 0.06rem 0.38rem; font-size: 0.52rem; line-height: 1.4; letter-spacing: 0.14em;
  background-size: 200% 100%; animation: shimmer 2.6s linear infinite;
}
:host([title-chip="god"]) {
  color: var(--bg); background-color: var(--god);
  background-image: linear-gradient(110deg, var(--god) 0 40%, var(--god-rim) 48%, var(--god) 56% 100%);
  box-shadow: 0 0 10px color-mix(in oklch, var(--god-rim) 55%, transparent);
}
:host([title-chip="demigod"]) {
  color: var(--fg); background-color: var(--demi-deep); animation-duration: 3.6s;
  background-image: linear-gradient(110deg, var(--demi-deep) 0 40%, var(--demi) 48%, var(--demi-deep) 56% 100%);
}
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { :host([title-chip]) { animation: none; background-image: none; } }`;

/**
 * `<gb-chip tier="master">Master</gb-chip>`: a small label next to a player's name.
 *
 * - `tier`: one of {@link tiers}, a tier chip in that tier's colour.
 * - `title-chip`: `god` (white, glowing) or `demigod` (deep red), with a light band sweeping across
 *   it. Off under reduced motion. Titles are the only chips that move.
 * - Neither: a grey chip, for text like a region ("EU"). Regions never get a colour.
 *
 * The text is the chip's content and shows uppercase; write it as you'd say it ("Grandmaster").
 */
export class GbChip extends HTMLElement {
  readonly #root = this.attachShadow({ mode: "open" });

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#root.append(style, document.createElement("slot"));
  }

  get tier(): Tier | undefined {
    const value = this.getAttribute("tier");
    return tiers.find((tier) => tier === value);
  }

  set tier(value: Tier | undefined) {
    if (value) this.setAttribute("tier", value);
    else this.removeAttribute("tier");
  }

  get titleChip(): ChipTitle | undefined {
    const value = this.getAttribute("title-chip");
    return titles.find((title) => title === value);
  }

  set titleChip(value: ChipTitle | undefined) {
    if (value) this.setAttribute("title-chip", value);
    else this.removeAttribute("title-chip");
  }
}

defineElement("gb-chip", GbChip);
