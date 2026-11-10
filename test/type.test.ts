import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";
import { type TokenName, tokens } from "../src/tokens.js";

const brand = readFileSync("docs/brand.md", "utf8");

/** The browser default the rem sizes are written against. */
const rootPx = 16;

/** A rem or px length in rem, or undefined for anything else. */
function rem(value: string): number | undefined {
  const match = /^(\d*\.?\d+)(rem|px)$/.exec(value.trim());
  if (!match) return undefined;
  return match[2] === "px" ? Number(match[1]) / rootPx : Number(match[1]);
}

const floor = rem(tokens["type-floor"]) ?? Number.NaN;
const sizeTokens = Object.keys(tokens).filter(
  (name) => name.endsWith("-size") && name !== "type-floor",
) as TokenName[];

/** True when the whole value is one `max(var(--type-floor), …)`, nothing before or after it. */
function isFloorMax(value: string): boolean {
  if (!/^max\(\s*var\(--type-floor\)\s*,/.test(value)) return false;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")" && --depth === 0) return i === value.length - 1;
  }
  return false;
}

/**
 * The smallest size a `font-size` value can come to, in rem. `inherit` is the parent's, checked
 * there. A value that is wholly a `max()` including the floor can't go under it. Anything else is
 * undefined, so a new way of writing a size gets looked at rather than passing unchecked.
 */
function smallest(value: string): number | undefined {
  const v = value.trim();
  if (v === "inherit") return Number.POSITIVE_INFINITY;
  const token = /^var\(--([a-z-]+)\)$/.exec(v)?.[1];
  if (token !== undefined) return token in tokens ? rem(tokens[token as TokenName]) : undefined;
  if (isFloorMax(v)) return floor;
  return rem(v);
}

/** A value split on top-level spaces, keeping `max(a, b)` and the like whole. */
function words(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let word = "";
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (/\s/.test(char) && depth === 0) {
      if (word) out.push(word);
      word = "";
    } else word += char;
  }
  if (word) out.push(word);
  return out;
}

/**
 * The size in a `font:` shorthand (`font: 700 0.7rem/1.2 Saira`): the word before the
 * `/line-height`, else the last word before the family that looks like a size (a length or a
 * function, not a bare weight). `inherit` and the other global keywords set no size of their own.
 * Undefined when no size can be found (a system font like `menu`), which the floor test flags.
 */
function shorthandSize(value: string): string | undefined {
  const v = value.trim();
  if (["inherit", "initial", "unset", "revert", "revert-layer"].includes(v)) return "inherit";
  // a comma at the top level starts the fallback families; commas inside max() don't count
  const beforeFallbacks =
    words(v)
      .join(" ")
      .split(/,(?![^(]*\))/)[0] ?? "";
  const list = words(beforeFallbacks);
  const slashed = list.find((word) => word.includes("/"));
  if (slashed !== undefined) return slashed.slice(0, slashed.indexOf("/"));
  return list.findLast((word) => /^(\d*\.?\d+[a-z%]+|[a-z-]+\(.*\))$/.test(word));
}

/** Every font size in the components' stylesheets and base.css, `font:` shorthands included. */
function fontSizes(): { where: string; value: string }[] {
  const files = readdirSync("src").filter((file) => file.endsWith(".ts") || file.endsWith(".css"));
  const sizes: { where: string; value: string }[] = [];
  for (const file of files) {
    const lines = readFileSync(`src/${file}`, "utf8").split("\n");
    lines.forEach((line, i) => {
      const where = `src/${file}:${i + 1}`;
      for (const match of line.matchAll(/font-size\s*[:=]\s*"?([^;}"]+)/g))
        sizes.push({ where, value: match[1] ?? "" });
      // CSS `font:`, not a JS `font: "…"` (the font-family token in tokens.ts)
      for (const match of line.matchAll(/(?<![-\w])font\s*:(?!\s*")\s*([^;}"]+)/g)) {
        const shorthand = match[1] ?? "";
        sizes.push({ where, value: shorthandSize(shorthand) ?? `font: ${shorthand}` });
      }
    });
  }
  return sizes;
}

test("the floor is the one brand.md states, and at least 10.5px", () => {
  expect(brand).toContain(`no text under ${tokens["type-floor"]}`);
  expect(floor * rootPx).toBeGreaterThanOrEqual(10.5);
});

test.each(sizeTokens)("%s is on or above the floor", (name) => {
  expect(rem(tokens[name])).toBeGreaterThanOrEqual(floor);
});

test("no component or base.css text is under the floor", () => {
  const sizes = fontSizes();
  expect(sizes.length).toBeGreaterThan(20);
  const under = sizes.filter(({ value }) => !((smallest(value) ?? -1) >= floor));
  expect(under).toEqual([]);
});

test("brand.md's type scale matches the tokens", () => {
  const rows = [...brand.matchAll(/^\| ([a-z]+) +\| ([\d.]+rem) +\| (\d+) +\| (\d+%) +\|/gm)];
  expect(rows.map((row) => row[1])).toEqual([
    "display",
    "heading",
    "title",
    "body",
    "compact",
    "small",
    "label",
  ]);
  for (const [, step = "", size, weight, width] of rows) {
    expect(tokens).toHaveProperty([`${step}-size`], size);
    expect(tokens).toHaveProperty([`${step}-weight`], weight);
    expect(tokens).toHaveProperty([`${step}-width`], width);
  }
});

test("chip sizes match brand.md", () => {
  expect(brand).toContain(`tier chip ${tokens["chip-size"]}`);
  expect(brand).toContain(`title chip (God, Demigod) ${tokens["title-chip-size"]}`);
});

test.each([
  ["max(var(--type-floor), 0.5rem)", true],
  ["max(var(--type-floor), calc(1em - 2px))", true],
  ["max(var(--type-floor), 1rem) * 0.5", false],
  ["calc(max(var(--type-floor), 1rem) * 0.5)", false],
  ["max(var(--type-floor), 1rem) 0.5rem", false],
] as const)("the floor's max() counts only as the whole value: %s", (value, counts) => {
  expect(smallest(value) === floor).toBe(counts);
});

test.each([
  ["inherit", "inherit"],
  ["700 0.6rem/1.2 Saira, sans-serif", "0.6rem"],
  ["italic 650 var(--small-size) Saira", "var(--small-size)"],
  ["max(var(--type-floor), 0.5rem)/1 Saira, sans-serif", "max(var(--type-floor), 0.5rem)"],
  ["700 9px Saira", "9px"],
  ["menu", undefined],
  ["700 Saira", undefined],
] as const)("a font shorthand's size is found: %s", (value, size) => {
  expect(shorthandSize(value)).toBe(size);
});

test("a size set through the font shorthand is checked against the floor", () => {
  expect(smallest(shorthandSize("700 0.6rem/1.2 Saira") ?? "")).toBeLessThan(floor);
  expect(smallest(shorthandSize("650 var(--label-size) Saira") ?? "")).toBeGreaterThanOrEqual(
    floor,
  );
});
