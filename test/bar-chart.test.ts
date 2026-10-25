import { afterEach, expect, test } from "vitest";
import { type Bar, type GbBarChart } from "../src/bar-chart.js";
import "../src/bar-chart.js";

const bars: Bar[] = [
  {
    value: 12,
    label: "Mon, Oct 5",
    text: "12 rated rounds",
    detail: "3 matches · 5 players",
    axis: "Oct 5",
  },
  { value: 0, label: "Tue, Oct 6", text: "0 rated rounds" },
  { value: 24, label: "Wed, Oct 7", text: "24 rated rounds", axis: "Today" },
];

function make(given: readonly Bar[] = bars, label?: string): GbBarChart {
  const chart = document.createElement("gb-bar-chart") as GbBarChart;
  if (label) chart.setAttribute("label", label);
  chart.bars = given;
  document.body.append(chart);
  return chart;
}

const root = (chart: GbBarChart) => chart.shadowRoot;
const barsOf = (chart: GbBarChart) => [
  ...(root(chart)?.querySelectorAll<HTMLElement>(".bar") ?? []),
];
const tipOf = (chart: GbBarChart) => root(chart)?.querySelector<HTMLElement>(".tip");
const key = (target: HTMLElement | undefined, name: string) =>
  target?.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
  );

afterEach(() => {
  document.body.replaceChildren();
});

test("a bar a value, sized to the highest; a zero is a stub", () => {
  const drawn = barsOf(make());
  expect(drawn.map((bar) => bar.style.blockSize)).toEqual(["50.0%", "", "100.0%"]);
  expect(drawn.map((bar) => bar.classList.contains("zero"))).toEqual([false, true, false]);
});

test("the axis is the first and last label, and the highest value is in the chart's label", () => {
  const chart = make(bars, "Rated rounds a day");
  expect(root(chart)?.querySelector(".axis")?.textContent).toBe("Oct 5Today");
  expect(root(chart)?.querySelector("[role=group]")?.getAttribute("aria-label")).toBe(
    "Rated rounds a day, most 24. Arrow keys step between the bars.",
  );
  expect(root(make([bars[1] as Bar]))?.querySelector(".axis")?.textContent).toBe("Tue, Oct 6");
});

test("each bar says its value to screen readers", () => {
  expect(barsOf(make()).map((bar) => bar.getAttribute("aria-label"))).toEqual([
    "Mon, Oct 5: 12 rated rounds, 3 matches · 5 players",
    "Tue, Oct 6: 0 rated rounds",
    "Wed, Oct 7: 24 rated rounds",
  ]);
  expect(barsOf(make([{ value: 1500, label: "Week 1" }]))[0]?.getAttribute("aria-label")).toBe(
    "Week 1: 1,500",
  );
});

test("one tab stop, and the arrow keys step between the bars", () => {
  const chart = make();
  const drawn = barsOf(chart);
  expect(drawn.map((bar) => bar.tabIndex)).toEqual([0, -1, -1]);
  drawn[0]?.focus();
  expect(tipOf(chart)?.hidden).toBe(false);
  expect(tipOf(chart)?.textContent).toBe("12 rated roundsMon, Oct 53 matches · 5 players");
  key(drawn[0], "ArrowRight");
  expect(root(chart)?.activeElement).toBe(drawn[1]);
  expect(barsOf(chart).map((bar) => bar.tabIndex)).toEqual([-1, 0, -1]);
  key(drawn[1], "End");
  expect(root(chart)?.activeElement).toBe(drawn[2]);
  key(drawn[2], "ArrowRight");
  expect(root(chart)?.activeElement).toBe(drawn[2]);
  key(drawn[2], "Home");
  expect(root(chart)?.activeElement).toBe(drawn[0]);
});

test("hovering a bar shows its tooltip, leaving hides it", () => {
  const chart = make();
  barsOf(chart)[2]?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
  expect(tipOf(chart)?.textContent).toBe("24 rated roundsWed, Oct 7");
  root(chart)?.querySelector(".bars")?.dispatchEvent(new PointerEvent("pointerleave"));
  expect(tipOf(chart)?.hidden).toBe(true);
});

test("no bars draws nothing", () => {
  const chart = make([]);
  expect(barsOf(chart)).toHaveLength(0);
  expect(root(chart)?.querySelector(".axis")?.textContent).toBe("");
});
