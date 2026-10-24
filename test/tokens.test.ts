import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { tokens, tokensCss } from "../src/tokens.js";

const brand = readFileSync("docs/brand.md", "utf8");

/** Every `| name | `oklch(...)` |` row of brand.md's colour tables, tier rows named `t-<tier>`. */
function brandTableColours(): Map<string, string> {
  const colours = new Map<string, string>();
  const tierRow = brand.indexOf("| Tier ");
  // The tier table ends at the first blank line after its header.
  const tierEnd = tierRow + brand.slice(tierRow).search(/\n\s*\n/);
  for (const match of brand.matchAll(/^\| ([A-Za-z-]+) +\| `(oklch\([^)]+\))`/gm)) {
    const [, name = "", value = ""] = match;
    const isTier = match.index > tierRow && match.index < tierEnd;
    colours.set(isTier ? `t-${name.toLowerCase()}` : name, value);
  }
  return colours;
}

test("every colour in brand.md's tables is a token with the same value", () => {
  const colours = brandTableColours();
  expect(colours.size).toBe(9 + 2 + 7 + 7 + 1);
  for (const [name, value] of colours) expect(tokens).toHaveProperty([name], value);
});

test("brand green and gold match brand.md", () => {
  expect(brand).toContain(`Brand green: \`${tokens.green}\``);
  expect(brand).toContain(`Gold \`${tokens.gold}\``);
});

test("no token is named after a hue", () => {
  const hues = /red|orange|yellow|blue|purple|violet|pink|teal|cyan|white|black|grey|gray/;
  for (const name of Object.keys(tokens)) expect(name).not.toMatch(hues);
});

test("tokensCss writes every token as a :root custom property", () => {
  const css = tokensCss();
  expect(css.startsWith(":root {\n")).toBe(true);
  expect(css).toContain("  --t-rookie: oklch(82% 0.07 185);\n");
  expect(css.match(/^ {2}--/gm)).toHaveLength(Object.keys(tokens).length);
});
