import { expect, test } from "vitest";
import { blend, contrastRatio, oklchToRgb, toHex } from "../src/color.js";
import { tokens } from "../src/tokens.js";

const rgb255 = (value: string) => oklchToRgb(value).map((channel) => Math.round(channel * 255));

test("oklchToRgb matches the game's tier RGB in brand.md", () => {
  expect(rgb255(tokens["t-rookie"])).toEqual([143, 211, 202]);
  expect(rgb255(tokens["t-apprentice"])).toEqual([207, 131, 88]);
  expect(rgb255(tokens["t-master"])).toEqual([232, 211, 79]);
  expect(rgb255(tokens["t-grandmaster"])).toEqual([240, 156, 23]);
  expect(rgb255(tokens["t-ascendant"])).toEqual([112, 154, 251]);
  expect(rgb255(tokens["t-champion"])).toEqual([251, 87, 93]);
  expect(rgb255(tokens["t-sovereign"])).toEqual([183, 119, 248]);
});

test("oklchToRgb handles white, black and alpha", () => {
  expect(rgb255("oklch(100% 0 0)")).toEqual([255, 255, 255]);
  expect(rgb255("oklch(0% 0 0)")).toEqual([0, 0, 0]);
  expect(rgb255("oklch(5% 0.01 210 / 0.55)")).toEqual(rgb255("oklch(5% 0.01 210)"));
  expect(() => oklchToRgb("#ffffff")).toThrow("Not an oklch() colour");
});

test("toHex", () => {
  expect(toHex(tokens["t-rookie"])).toBe("#8fd3ca");
  expect(toHex(tokens.god)).toBe("#ffffff");
});

test("contrastRatio gives WCAG's known values", () => {
  const white = [1, 1, 1] as const;
  const black = [0, 0, 0] as const;
  expect(contrastRatio(white, black)).toBe(21);
  expect(contrastRatio(black, white)).toBe(21);
  expect(contrastRatio(white, white)).toBe(1);
  // #767676 on white is the classic just-passing grey.
  expect(contrastRatio([0x76 / 255, 0x76 / 255, 0x76 / 255], white)).toBeCloseTo(4.54, 2);
});

test("blend mixes in sRGB", () => {
  expect(blend([1, 1, 1], [0, 0, 0], 0.25)).toEqual([0.25, 0.25, 0.25]);
});
