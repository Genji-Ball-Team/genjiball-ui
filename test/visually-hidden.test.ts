import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

// Text hidden for screen readers only (a 1px, clipped, absolutely positioned box) is placed against
// its nearest positioned ancestor. With none in the component, that's the page: in a panel that
// scrolls, the hidden text can sit below the fold and make the whole page scrollable. So each
// component with such text puts it in a positioned box of its own.

const host = /:host \{[^}]*position: relative/;

/** Each file hiding text this way, and the rule that positions the box around that text. */
const contained: Record<string, RegExp> = {
  "button.ts": host,
  "count.ts": host,
  "delta.ts": host,
  "search-styles.ts": /gb-search \{[^}]*position: relative/,
  "leaderboard.ts": /gb-leaderboard > table \{[^}]*position: relative/,
  "toast.ts": /:host \{[^}]*position: fixed/,
  // The charts' hidden text (styled in chart-parts) sits in each chart's host.
  "chart-parts.ts": /\.gb-sr/,
  "rating-chart.ts": host,
  "compare-chart.ts": host,
  "bar-chart.ts": host,
};

const hiding =
  /position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset\(50%\)/;

test("every component with visually hidden text has a positioned box around it", () => {
  const files = readdirSync("src").filter((file) => file.endsWith(".ts"));
  const hides = files.filter((file) => hiding.test(readFileSync(`src/${file}`, "utf8")));
  // A new component hiding text this way is added above, with the box that holds it.
  expect(hides.filter((file) => !(file in contained))).toEqual([]);
  for (const [file, container] of Object.entries(contained))
    expect(readFileSync(`src/${file}`, "utf8"), file).toMatch(container);
});
