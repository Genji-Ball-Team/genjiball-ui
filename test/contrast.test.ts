import { describe, expect, test } from "vitest";
import { blend, contrastRatio, oklchToRgb } from "../src/color.js";
import { type TokenName, tokens } from "../src/tokens.js";

// WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and UI outlines.
const text = 4.5;
const ui = 3;

const surfaces = ["bg", "panel", "raised"] as const;
const textColours = ["fg", "soft", "muted", "green", "up", "down", "gold"] as const;
const tiers = Object.keys(tokens).filter((name) => name.startsWith("t-")) as TokenName[];

/** Tier chips: tier-coloured text on the tier colour at 16% over the row (brand sheet `.chip`). */
const chipTint = 0.16;

const rgb = (name: TokenName) => oklchToRgb(tokens[name]);

describe.each(surfaces)("on %s", (surface) => {
  test.each(textColours)("%s text", (colour) => {
    expect(contrastRatio(rgb(colour), rgb(surface))).toBeGreaterThanOrEqual(text);
  });

  test.each(tiers)("%s chip", (tier) => {
    const chip = blend(rgb(tier), rgb(surface), chipTint);
    expect(contrastRatio(rgb(tier), chip)).toBeGreaterThanOrEqual(text);
  });

  test("plain (region) chip", () => {
    const chip = blend(rgb("soft"), rgb(surface), chipTint);
    expect(contrastRatio(rgb("soft"), chip)).toBeGreaterThanOrEqual(text);
  });

  test("control-border edge", () => {
    expect(contrastRatio(rgb("control-border"), rgb(surface))).toBeGreaterThanOrEqual(ui);
  });
});

test("primary buttons: dark text on brand green", () => {
  expect(contrastRatio(rgb("bg"), rgb("green"))).toBeGreaterThanOrEqual(text);
});

test("a win in the recent form: dark text on up", () => {
  expect(contrastRatio(rgb("bg"), rgb("up"))).toBeGreaterThanOrEqual(text);
});

// Title chips: every colour the shimmer passes under the text, from the base to the band's peak.
test.each([
  ["god", "bg", ["god", "god-rim"]],
  ["demigod", "fg", ["demi-deep", "demi"]],
] as const)("%s chip: %s text across its shimmer", (_, colour, fills) => {
  for (const fill of fills)
    expect(contrastRatio(rgb(colour), rgb(fill))).toBeGreaterThanOrEqual(text);
});

// Leaderboard title rows: each text on them over the haze at the row's start, its lightest point.
// The God row's place and rating are white, so muted never sits on it.
test.each([
  ["god row", blend(rgb("god-cream"), rgb("panel"), 0.14), ["fg", "god", "up", "down"]],
  [
    "demigod row",
    blend(rgb("demi"), blend(rgb("demi-dark"), rgb("bg"), 0.17), 0.14),
    ["fg", "muted", "up", "down"],
  ],
] as const)("%s: its text passes over the haze", (_, fill, colours) => {
  for (const colour of colours)
    expect(contrastRatio(rgb(colour), fill)).toBeGreaterThanOrEqual(text);
});

test("muted on raised is the weakest text pair, as brand.md says", () => {
  expect(contrastRatio(rgb("muted"), rgb("raised"))).toBeCloseTo(5.0, 1);
});
