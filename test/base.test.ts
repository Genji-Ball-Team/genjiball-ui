import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { tokens } from "../src/tokens.js";

const css = readFileSync("src/base.css", "utf8");

test("base.css only uses tokens that exist", () => {
  const used = [...css.matchAll(/var\(--([a-z-]+)\)/g)].map(([, name = ""]) => name);
  expect(used.length).toBeGreaterThan(0);
  for (const name of used) expect(tokens).toHaveProperty([name]);
});

test("base.css loads Saira from the package, never from Google Fonts", () => {
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map(([, url = ""]) => url);
  expect(urls).toEqual(["./fonts/saira-latin.woff2", "./fonts/saira-latin-ext.woff2"]);
  for (const url of urls) expect(existsSync(`src/${url}`)).toBe(true);
  expect(existsSync("src/fonts/OFL.txt")).toBe(true);
});

test("base.css has a green focus ring and turns motion off when asked", () => {
  expect(css).toContain(":focus-visible {\n  outline: 2px solid var(--green);");
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
});
