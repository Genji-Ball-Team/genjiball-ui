/**
 * Every design token from docs/brand.md, keyed by its CSS custom property name without the `--`.
 * The build writes these to `tokens.css` as `:root` properties; code that can't read CSS (charts,
 * the bot) imports them from here. Names say what a token is for, never its hue.
 */
export const tokens = {
  // Surfaces, darkest first, then the edges and text colours that sit on them.
  bg: "oklch(15% 0.007 210)",
  panel: "oklch(17.7% 0.008 210)",
  raised: "oklch(21.4% 0.010 210)",
  line: "oklch(24% 0.011 210)",
  border: "oklch(28% 0.012 210)",
  "control-border": "oklch(52% 0.012 210)",
  muted: "oklch(63% 0.012 210)",
  soft: "oklch(80% 0.008 210)",
  fg: "oklch(96% 0.005 210)",

  // Meaning. Green is Genji Ball and interactive only, gold is earned prestige only.
  green: "oklch(79% 0.132 158)",
  up: "oklch(80% 0.11 230)",
  down: "oklch(73% 0.16 48)",
  gold: "oklch(86.6% 0.126 90)",

  // Titles: God is white light, Demigod is dark red.
  god: "oklch(100% 0 0)",
  "god-cream": "oklch(97% 0.04 93)",
  "god-rim": "oklch(93.7% 0.086 92)",
  demi: "oklch(48.6% 0.185 28)",
  "demi-hi": "oklch(62.6% 0.182 32)",
  "demi-deep": "oklch(36.4% 0.149 29)",
  "demi-dark": "oklch(24% 0.026 11)",

  // Rank tiers, shared with genjiball-ranked and the game. Only on tier chips and row side bars.
  "t-rookie": "oklch(82% 0.07 185)",
  "t-apprentice": "oklch(68% 0.11 50)",
  "t-master": "oklch(86% 0.15 100)",
  "t-grandmaster": "oklch(76% 0.16 70)",
  "t-ascendant": "oklch(70% 0.15 265)",
  "t-champion": "oklch(68% 0.2 22)",
  "t-sovereign": "oklch(69% 0.19 305)",

  // Shape and depth. Only things on top and temporary get the shadow.
  r: "6px",
  "r-chip": "4px",
  "shadow-float": "0 8px 24px oklch(5% 0.01 210 / 0.55), 0 2px 6px oklch(5% 0.01 210 / 0.4)",

  // Type: Saira only. Width does the work: condensed for labels, headings and big numbers.
  font: "Saira, system-ui, sans-serif",
  "display-size": "2.4rem",
  "display-weight": "750",
  "display-width": "78%",
  "heading-size": "1.4rem",
  "heading-weight": "700",
  "heading-width": "80%",
  "title-size": "1.05rem",
  "title-weight": "650",
  "title-width": "85%",
  "body-size": "0.9rem",
  "body-weight": "400",
  "body-width": "100%",
  "label-size": "0.64rem",
  "label-weight": "700",
  "label-width": "75%",
  "label-tracking": "0.16em",

  // Motion: the blade slash, the count-up and the delta after it, and quick fades like tooltips.
  "slash-duration": "0.55s",
  "slash-ease": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "count-duration": "0.6s",
  "count-ease": "ease-out",
  "delta-duration": "0.5s",
  "delta-delay": "0.15s",
  "fade-duration": "0.1s",
} as const;

export type TokenName = keyof typeof tokens;

/** The tokens as one `:root` rule, the contents of `tokens.css`. */
export function tokensCss(): string {
  const lines = Object.entries(tokens).map(([name, value]) => `  --${name}: ${value};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}
