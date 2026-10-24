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

  test("control-border edge", () => {
    expect(contrastRatio(rgb("control-border"), rgb(surface))).toBeGreaterThanOrEqual(ui);
  });
});

test("primary buttons: dark text on brand green", () => {
  expect(contrastRatio(rgb("bg"), rgb("green"))).toBeGreaterThanOrEqual(text);
});

test("muted on raised is the weakest text pair, as brand.md says", () => {
  expect(contrastRatio(rgb("muted"), rgb("raised"))).toBeCloseTo(5.0, 1);
});
