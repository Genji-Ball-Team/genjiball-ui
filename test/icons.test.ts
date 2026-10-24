import { expect, test } from "vitest";
import { iconSvg, icons, isIconName, type IconName } from "../src/icons.js";

const names = Object.keys(icons) as IconName[];

test("the set has the six icons brand.md names", () => {
  expect(names).toEqual(["player", "matches", "records", "deflects", "live", "leaderboard"]);
});

test.each(names)("%s is drawn in currentColor only, with no ids to collide", (name) => {
  const svg = iconSvg(name);
  expect(svg).not.toMatch(/\b(id|mask|clip-path|style|class)=/);
  expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i);
  expect([...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map(([, value = ""]) => value)).toEqual([
    "none",
    "currentColor",
    "currentColor",
    "none",
  ]);
});

test.each(names)("%s stays on the 24px grid", (name) => {
  const { fill, outline } = icons[name];
  // Every number in the drawing, with room for half the stroke: nothing reaches past 1px of the edge.
  const numbers = [...`${fill}${outline}`.matchAll(/-?\d*\.?\d+/g)].map(([value]) => Number(value));
  expect(numbers.length).toBeGreaterThan(0);
  for (const value of numbers) expect(value).toBeLessThanOrEqual(23);
});

test("iconSvg hides a decorative icon and names a labelled one", () => {
  expect(iconSvg("live")).toContain('aria-hidden="true" focusable="false"');
  expect(iconSvg("live")).not.toContain("role=");
  const labelled = iconSvg("live", 'Live "now" & <soon>');
  expect(labelled).toContain('role="img" aria-label="Live &quot;now&quot; &amp; &lt;soon>"');
  expect(labelled).not.toContain("aria-hidden");
});

test("isIconName knows the set and nothing inherited", () => {
  expect(isIconName("records")).toBe(true);
  expect(isIconName("toString")).toBe(false);
  expect(isIconName("")).toBe(false);
});
