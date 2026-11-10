import { expect, test } from "vitest";
import { chartScale, lineCrosses, ordinal, spreadLabels } from "../src/chart-scale.js";

test("the range holds every value, with room above and below", () => {
  const scale = chartScale([1800, 1850, 2000]);
  expect(scale.lo).toBeLessThan(1800);
  expect(scale.hi).toBeGreaterThan(2000);
  expect(scale.ticks).toEqual([1800, 1900, 2000]);
});

test("a tier threshold just past the values is pulled in, a far one isn't", () => {
  const near = chartScale([1820, 1880], { thresholds: [1900] });
  expect(near.hi).toBeGreaterThan(1900);
  const far = chartScale([1820, 1880], { thresholds: [2200] });
  expect(far.hi).toBeLessThan(1900);
});

test("a flat run still spans the minimum, centred on it", () => {
  const scale = chartScale([1500, 1500, 1500]);
  expect(scale.hi - scale.lo).toBeGreaterThanOrEqual(40);
  expect((scale.hi + scale.lo) / 2).toBeCloseTo(1500);
  expect(scale.ticks.length).toBeGreaterThan(1);
});

test("the axis has at most five labels", () => {
  for (const values of [
    [0, 3000],
    [1000, 1012],
    [1200, 1700],
  ])
    expect(chartScale(values).ticks.length).toBeLessThanOrEqual(5);
});

test("ordinals", () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual([
    "1st",
    "2nd",
    "3rd",
    "4th",
    "11th",
    "12th",
    "13th",
    "21st",
    "22nd",
    "23rd",
  ]);
});

test("whether a line runs through a box", () => {
  const line = [
    { x: 0, y: 100 },
    { x: 100, y: 0 },
    { x: 200, y: 0 },
  ];
  const box = (x: number, y: number) =>
    [
      { x, y },
      { x: x + 40, y: y + 14 },
    ] as const;
  expect(lineCrosses(line, ...box(30, 50))).toBe(true); // on the slope
  expect(lineCrosses(line, ...box(0, 20))).toBe(false); // above it on the left
  expect(lineCrosses(line, ...box(150, 20))).toBe(false); // below the flat part
  expect(lineCrosses(line, ...box(150, -7))).toBe(true); // over the flat part
  expect(lineCrosses(line, ...box(300, 0))).toBe(false); // past its end
  expect(lineCrosses([{ x: 50, y: 50 }], ...box(30, 40))).toBe(true); // one point
});

test("labels at close ends are spread a gap apart, in order", () => {
  expect(spreadLabels([50, 52], { gap: 13, max: 200 })).toEqual([50, 63]);
  expect(spreadLabels([52, 50], { gap: 13, max: 200 })).toEqual([63, 50]);
  expect(spreadLabels([60, 60, 61], { gap: 13, max: 200 })).toEqual([60, 73, 86]);
  expect(spreadLabels([10, 100], { gap: 13, max: 200 })).toEqual([10, 100]);
});

test("spread labels stay between min and max", () => {
  expect(spreadLabels([198, 199, 200], { gap: 13, min: 6, max: 194 })).toEqual([168, 181, 194]);
  expect(spreadLabels([2, 1, 0], { gap: 13, min: 6, max: 194 })).toEqual([32, 19, 6]);
});

test("labels side by side don't push each other; overlapping ones do", () => {
  const spans = [
    [0, 40],
    [100, 140],
    [120, 160],
  ] as const;
  expect(spreadLabels([50, 50, 50], { gap: 13, max: 200, spans })).toEqual([50, 50, 63]);
});

test("a line with no end gets no label", () => {
  expect(spreadLabels([Number.NaN, 50], { gap: 13, max: 200 })).toEqual([Number.NaN, 50]);
});
