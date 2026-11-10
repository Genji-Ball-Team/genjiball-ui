import { afterEach, expect, test } from "vitest";
import {
  type CompareOpenDetail,
  type CompareSeries,
  type GbCompareChart,
} from "../src/compare-chart.js";
import "../src/compare-chart.js";

const hour = 3_600_000;
const start = Date.parse("2026-10-01T12:00:00Z");
const series: CompareSeries[] = [
  {
    name: "Ana",
    points: [
      { rating: 1800, at: start, label: "Match #1", href: "/match?id=1" },
      { rating: 1830, at: start + 2 * hour, label: "Match #3", href: "/match?id=3" },
      { rating: 1850, at: start + 4 * hour, label: "Match #5", href: "/match?id=5" },
    ],
  },
  {
    name: "Ben",
    points: [
      { rating: 1700, at: start + hour, label: "Match #2", href: "/match?id=2" },
      { rating: 1760, at: start + 4 * hour, label: "Match #5", href: "/match?id=5" },
    ],
  },
];

function make(given: readonly CompareSeries[] = series, axis?: string): GbCompareChart {
  const chart = document.createElement("gb-compare-chart") as GbCompareChart;
  if (axis) chart.setAttribute("axis", axis);
  chart.series = given;
  chart.tiers = [
    { tier: "grandmaster", label: "Grandmaster", threshold: 1900 },
    { tier: "ascendant", label: "Ascendant", threshold: 2600 },
  ];
  document.body.append(chart);
  return chart;
}

const root = (chart: GbCompareChart) => chart.shadowRoot;
const svgOf = (chart: GbCompareChart) => root(chart)?.querySelector("svg");
const tipOf = (chart: GbCompareChart) => root(chart)?.querySelector<HTMLElement>(".tip");
const key = (chart: GbCompareChart, name: string) =>
  svgOf(chart)?.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
  );
const opened = (chart: GbCompareChart) => {
  const seen: CompareOpenDetail[] = [];
  chart.addEventListener("open", (event) => {
    seen.push((event as CustomEvent<CompareOpenDetail>).detail);
    event.preventDefault();
  });
  return seen;
};
const names = (chart: GbCompareChart) =>
  [...(svgOf(chart)?.querySelectorAll(".name") ?? [])].map((name) => name.textContent);

afterEach(() => {
  document.body.replaceChildren();
});

test("each player has a line told apart by stroke, a name at its end and a place in the key", () => {
  const chart = make();
  expect(svgOf(chart)?.querySelectorAll("g.s0 > .line, g.s1 > .line")).toHaveLength(2);
  expect(names(chart)).toEqual(["Ana", "Ben"]);
  expect(root(chart)?.querySelector(".key")?.textContent).toBe("AnaBen");
  expect(root(chart)?.querySelectorAll(".key .sw.s0, .key .sw.s1")).toHaveLength(2);
});

test("only three players are drawn, and long names are cut on the chart only", () => {
  const four = ["A", "B", "C", "Dee"].map((name) => ({ name, points: [{ rating: 1500 }] }));
  expect(names(make(four))).toHaveLength(3);
  const long = make([{ name: "A very long player name", points: [{ rating: 1500 }] }]);
  expect(names(long)).toEqual(["A very long p…"]);
  expect(root(long)?.querySelector(".key")?.textContent).toBe("A very long player name");
});

const nameYs = (chart: GbCompareChart) =>
  [...(svgOf(chart)?.querySelectorAll(".name") ?? [])].map((name) =>
    Number(name.getAttribute("y")),
  );

/** Players whose lines end at `ends`, with a tier far below so the chart spans a few hundred. */
const ending = (ends: number[]) =>
  ends.map((rating, n) => ({
    name: ["Ana", "Ben", "Cy"][n] ?? "",
    points: [{ rating: 1400 + n * 40 }, { rating: 1900 - n * 50 }, { rating }],
  }));

/** Each name at least a line apart from the next, top to bottom in the order the lines end. */
function expectApartInOrder(ys: number[], ends: number[]): void {
  const order = ends.map((_, n) => n).sort((a, b) => (ends[b] ?? 0) - (ends[a] ?? 0));
  const sorted = order.map((n) => ys[n] ?? 0);
  sorted.slice(1).forEach((y, i) => {
    expect(y - (sorted[i] ?? 0)).toBeGreaterThanOrEqual(14);
  });
}

test("close line ends keep their names apart", () => {
  const close = ["Ana", "Ben"].map((name) => ({
    name,
    points: [{ rating: 1500 }, { rating: 1500 }],
  }));
  const ys = nameYs(make(close));
  expect(Math.abs((ys[0] ?? 0) - (ys[1] ?? 0))).toBeGreaterThanOrEqual(14);
});

test("two near-equal endings: the names are nudged apart, the higher one stays on top", () => {
  for (const ends of [
    [1620, 1600],
    [1600, 1620],
    [1610, 1610],
  ]) {
    const ys = nameYs(make(ending(ends)));
    expectApartInOrder(ys, ends);
    document.body.replaceChildren();
  }
});

test("three near-equal endings keep their order and all stay inside the chart", () => {
  for (const ends of [
    [1600, 1610, 1605],
    [1700, 1700, 1700],
    // At the top and the bottom of the range, where nudging could push a name out.
    [1950, 1948, 1946],
    [1400, 1402, 1398],
  ]) {
    const chart = make(ending(ends));
    const ys = nameYs(chart);
    expectApartInOrder(ys, ends);
    const height = Number(svgOf(chart)?.getAttribute("height"));
    for (const y of ys) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(height);
    }
    document.body.replaceChildren();
  }
});

test("names at ends far apart over time aren't pushed by each other", () => {
  const chart = make(
    [
      {
        name: "Ana",
        points: [
          { rating: 1500, at: start },
          { rating: 1600, at: start + 10 * hour },
        ],
      },
      {
        name: "Ben",
        points: [
          { rating: 1520, at: start },
          { rating: 1600, at: start + 2 * hour },
        ],
      },
    ],
    "time",
  );
  const ends = [...(svgOf(chart)?.querySelectorAll(".last") ?? [])].map((dot) =>
    Number(dot.getAttribute("cy")),
  );
  expect(nameYs(chart)).toEqual(ends);
});

test("only tiers near the ratings shown get a line and chip", () => {
  const chips = [...(svgOf(make())?.querySelectorAll(".tier text") ?? [])];
  expect(chips.map((chip) => chip.textContent)).toEqual(["GRANDMASTER"]);
});

test("screen readers hear the players and how to use it", () => {
  expect(svgOf(make())?.getAttribute("aria-label")).toBe(
    "Ratings by match: Ana from 1,800 to 1,850; Ben from 1,700 to 1,760. Arrow keys step through the points, Enter opens one.",
  );
  expect(svgOf(make(series, "time"))?.getAttribute("aria-label")).toMatch(/^Ratings over time: /);
  const chart = make();
  chart.setAttribute("label", "Ana against Ben");
  expect(svgOf(chart)?.getAttribute("aria-label")).toMatch(/^Ana against Ben\. Arrow/);
});

test("by match, the tooltip lists everyone's nth match; a player with fewer shows a dash", () => {
  const chart = make();
  const said = root(chart)?.querySelector("[aria-live]");
  key(chart, "End");
  expect(tipOf(chart)?.textContent).toBe("Match 3Ana1,850Ben–Open match →");
  expect(said?.textContent).toBe("Match 3: Ana 1,850, Ben not yet");
  key(chart, "Home");
  expect(said?.textContent).toBe("Match 1: Ana 1,800, Ben 1,700");
});

test("over time, a rating holds until the player's next match, drawn as steps", () => {
  const chart = make(series, "time");
  const said = root(chart)?.querySelector("[aria-live]");
  key(chart, "Home");
  expect(said?.textContent).toMatch(/Ana 1,800, Ben not yet$/);
  key(chart, "ArrowRight");
  expect(said?.textContent).toMatch(/Ana 1,800, Ben 1,700$/);
  key(chart, "ArrowRight");
  expect(said?.textContent).toMatch(/Ana 1,830, Ben 1,700$/);
  // Three points make five corners: each step is a flat run then a rise.
  const d = svgOf(chart)?.querySelector("g.s0 > .line")?.getAttribute("d") ?? "";
  expect(d.match(/L/g)).toHaveLength(4);
});

test("Enter opens the match of the player who has one at that stop", () => {
  const chart = make(series, "time");
  const seen = opened(chart);
  key(chart, "Enter");
  expect(seen).toEqual([]);
  key(chart, "Home");
  key(chart, "ArrowRight");
  key(chart, "Enter");
  expect(seen.map(({ series: who, index }) => [who, index])).toEqual([[1, 0]]);
  expect(seen[0]?.point.href).toBe("/match?id=2");
});

test("a mouse click opens the point under it; a tap shows it first", () => {
  const chart = make();
  const seen = opened(chart);
  const svg = svgOf(chart);
  // The first stop is drawn at x = 42, the left edge of the plot.
  const at = (type: string, pointerType = "mouse") =>
    svg?.dispatchEvent(
      new PointerEvent(type, { clientX: 42, clientY: 0, pointerType, bubbles: true }),
    );
  at("pointerdown");
  svg?.dispatchEvent(new MouseEvent("click"));
  expect(seen.map(({ series: who, index }) => [who, index])).toEqual([[0, 0]]);
  at("pointerleave");
  at("pointerdown", "touch");
  svg?.dispatchEvent(new MouseEvent("click"));
  expect(seen).toHaveLength(1);
  at("pointerdown", "touch");
  svg?.dispatchEvent(new MouseEvent("click"));
  expect(seen).toHaveLength(2);
});

test("no players draws nothing and can't be focused; a redraw keeps focus and the stop", () => {
  const chart = make([]);
  expect(svgOf(chart)?.style.display).toBe("none");
  expect(svgOf(chart)?.hasAttribute("tabindex")).toBe(false);
  expect(root(chart)?.querySelector<HTMLElement>(".key")?.hidden).toBe(true);
  chart.series = series;
  svgOf(chart)?.focus();
  key(chart, "End");
  key(chart, "ArrowLeft");
  chart.setAttribute("height", "200");
  expect(root(chart)?.activeElement).toBe(svgOf(chart));
  expect(tipOf(chart)?.hidden).toBe(false);
  expect(tipOf(chart)?.textContent).toContain("Match 2");
});

test("one point draws and reads out", () => {
  const chart = make([{ name: "Ana", points: [{ rating: 1500 }] }]);
  key(chart, "End");
  expect(tipOf(chart)?.textContent).toBe("Match 1Ana1,500");
});
