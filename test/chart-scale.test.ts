import { expect, test } from "vitest";
import {
  chartScale,
  evenIndexes,
  keepApart,
  lineCrosses,
  ordinal,
  spreadLabels,
  tickCount,
  timeTicks,
} from "../src/chart-scale.js";

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

test("how many axis labels fit: one per 70px, two to seven", () => {
  expect([100, 291, 548, 2000].map(tickCount)).toEqual([2, 4, 7, 7]);
});

test("evenly spaced indexes take in both ends", () => {
  expect(evenIndexes(40, 4)).toEqual([0, 13, 26, 39]);
  expect(evenIndexes(3, 7)).toEqual([0, 1, 2]);
  expect(evenIndexes(1, 4)).toEqual([0]);
  expect(evenIndexes(0, 4)).toEqual([]);
});

test("labels that would touch are dropped, the ends kept", () => {
  expect(
    keepApart(
      [
        [0, 30],
        [40, 70],
        [60, 90],
        [100, 130],
      ],
      8,
    ),
  ).toEqual([0, 1, 3]);
  // The last wins over the one before it.
  expect(
    keepApart(
      [
        [0, 30],
        [40, 70],
        [75, 105],
      ],
      8,
    ),
  ).toEqual([0, 2]);
  // Only the two ends, touching: the first stays.
  expect(
    keepApart(
      [
        [0, 30],
        [20, 50],
      ],
      8,
    ),
  ).toEqual([0]);
});

const hour = 3_600_000;
const day = 24 * hour;
const start = new Date(2026, 8, 3, 15, 20).getTime();

function expectRound(ticks: { at: number }[], from: number, to: number, count: number): void {
  expect(ticks.length).toBeGreaterThan(1);
  expect(ticks.length).toBeLessThanOrEqual(count);
  ticks.forEach(({ at }, n) => {
    expect(at).toBeGreaterThanOrEqual(from);
    expect(at).toBeLessThanOrEqual(to);
    if (n) expect(at).toBeGreaterThan(ticks[n - 1]?.at ?? 0);
  });
}

test("time ticks over a month are round days, labelled by date", () => {
  const ticks = timeTicks(start, start + 30 * day, 4);
  expectRound(ticks, start, start + 30 * day, 4);
  for (const { at, text } of ticks) {
    expect(new Date(at).getHours()).toBe(0);
    expect(text).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  }
  // Seven fit: a week apart.
  const week = timeTicks(start, start + 30 * day, 7);
  expectRound(week, start, start + 30 * day, 7);
  expect(Math.round(((week[1]?.at ?? 0) - (week[0]?.at ?? 0)) / day)).toBe(7);
});

test("time ticks within a day are round hours; over a year, months", () => {
  const hours = timeTicks(start, start + 10 * hour, 4);
  expectRound(hours, start, start + 10 * hour, 4);
  for (const { at, text } of hours) {
    expect(new Date(at).getMinutes()).toBe(0);
    expect(text).toMatch(new Date(at).getHours() ? /^\d{1,2}\s[AP]M$/ : /^[A-Z][a-z]{2} \d/);
  }
  const months = timeTicks(start, start + 400 * day, 5);
  expectRound(months, start, start + 400 * day, 5);
  for (const { at, text } of months) {
    expect(new Date(at).getDate()).toBe(1);
    expect(text).toMatch(/^([A-Z][a-z]{2}|\d{4})$/);
  }
  expect(months.map(({ text }) => text)).toContain("2027");
});

test("room for two labels still gets two dates, even if a round step gives three", () => {
  for (const days of [30, 190]) {
    const ticks = timeTicks(start, start + days * day, 2);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(3);
  }
});

test("no span, or less than an hour, is one date", () => {
  expect(timeTicks(start, start, 4)).toHaveLength(1);
  expect(timeTicks(start, start + 10 * 60_000, 4)).toHaveLength(1);
  expect(timeTicks(Number.NaN, start, 4)).toEqual([]);
});
