import { afterEach, expect, test } from "vitest";
import { type GbRatingChart, type OpenDetail, type RatingPoint } from "../src/rating-chart.js";
import "../src/rating-chart.js";

const points: RatingPoint[] = [
  { rating: 1830, label: "Match #1", place: 3, players: 6, href: "/match?id=1" },
  { rating: 1854, label: "Match #2", place: 1, players: 6, href: "/match?id=2" },
  { rating: 1843, label: "Match #3", place: 4, players: 6, href: "/match?id=3" },
  { rating: 1891, change: 48, label: "Match #4", place: 1, players: 5, href: "/match?id=4" },
];

function make(given: readonly RatingPoint[] = points, label?: string): GbRatingChart {
  const chart = document.createElement("gb-rating-chart") as GbRatingChart;
  if (label) chart.setAttribute("label", label);
  chart.points = given;
  chart.tiers = [
    { tier: "grandmaster", label: "Grandmaster", threshold: 1900 },
    { tier: "ascendant", label: "Ascendant", threshold: 2200 },
  ];
  document.body.append(chart);
  return chart;
}

const svgOf = (chart: GbRatingChart) => chart.shadowRoot?.querySelector("svg");
const tipOf = (chart: GbRatingChart) => chart.shadowRoot?.querySelector<HTMLElement>(".tip");
const key = (chart: GbRatingChart, name: string) =>
  svgOf(chart)?.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
  );

// Points are drawn at x = 42 + i * 516 / 3 in a box with no width (happy-dom draws at 600).
const pointer = (chart: GbRatingChart, type: string, index: number, pointerType = "mouse") =>
  svgOf(chart)?.dispatchEvent(
    new PointerEvent(type, { clientX: 42 + (index * 516) / 3, pointerType, bubbles: true }),
  );

const opened = (chart: GbRatingChart, cancel = true) => {
  const seen: number[] = [];
  chart.addEventListener("open", (event) => {
    seen.push((event as CustomEvent<OpenDetail>).detail.index);
    if (cancel) event.preventDefault();
  });
  return seen;
};

afterEach(() => {
  document.body.replaceChildren();
});

test("the whole line's direction is the net change over the points shown", () => {
  expect(make().getAttribute("direction")).toBe("up");
  expect(
    make([{ rating: 1900 }, { rating: 1950 }, { rating: 1880 }]).getAttribute("direction"),
  ).toBe("down");
  expect(make([{ rating: 1900 }, { rating: 1900 }]).getAttribute("direction")).toBe("none");
  expect(svgOf(make())?.querySelectorAll(".line")).toHaveLength(1);
});

test("only tiers near the ratings shown get a line and chip", () => {
  const chips = [...(svgOf(make())?.querySelectorAll(".tier text") ?? [])];
  expect(chips.map((chip) => chip.textContent)).toEqual(["GRANDMASTER"]);
});

test("screen readers hear what it shows and how to use it", () => {
  expect(svgOf(make())?.getAttribute("aria-label")).toBe(
    "Rating over 4 matches, from 1,830 to 1,891. Arrow keys step through the matches, Enter opens one.",
  );
  expect(svgOf(make(points, "Rating this season"))?.getAttribute("aria-label")).toMatch(
    /^Rating this season\. Arrow/,
  );
  expect(svgOf(make([{ rating: 1200 }]))?.getAttribute("aria-label")).toBe(
    "Rating over 1 match, from 1,200 to 1,200. Arrow keys step through the matches.",
  );
});

test("the keyboard steps through the points and reads each out", () => {
  const chart = make();
  const said = chart.shadowRoot?.querySelector("[aria-live]");
  key(chart, "ArrowRight");
  expect(tipOf(chart)?.hidden).toBe(false);
  expect(tipOf(chart)?.textContent).toBe("Match #4 · 1st of 51,891 ▲ 48Open match →");
  expect(said?.textContent).toBe("Match #4, 1st of 5, 1,891, up 48");
  key(chart, "ArrowLeft");
  expect(said?.textContent).toBe("Match #3, 4th of 6, 1,843, down 11");
  key(chart, "Home");
  expect(said?.textContent).toBe("Match #1, 3rd of 6, 1,830");
  key(chart, "ArrowLeft");
  expect(said?.textContent).toBe("Match #1, 3rd of 6, 1,830");
  key(chart, "Escape");
  expect(tipOf(chart)?.hidden).toBe(true);
});

test("Enter opens the point picked, and only one is picked", () => {
  const chart = make();
  const seen = opened(chart);
  key(chart, "Enter");
  expect(seen).toEqual([]);
  key(chart, "End");
  key(chart, "ArrowLeft");
  key(chart, "Enter");
  expect(seen).toEqual([2]);
});

test("a mouse click opens the point under it; a tap shows it first, a second tap opens it", () => {
  const chart = make();
  const seen = opened(chart);
  pointer(chart, "pointerdown", 1);
  svgOf(chart)?.dispatchEvent(new MouseEvent("click"));
  expect(seen).toEqual([1]);

  pointer(chart, "pointerleave", 1);
  pointer(chart, "pointerdown", 2, "touch");
  svgOf(chart)?.dispatchEvent(new MouseEvent("click"));
  expect(seen).toEqual([1]);
  expect(tipOf(chart)?.textContent).toContain("Match #3");
  pointer(chart, "pointerdown", 2, "touch");
  svgOf(chart)?.dispatchEvent(new MouseEvent("click"));
  expect(seen).toEqual([1, 2]);
});

test("a point without a link has no Open match", () => {
  const chart = make([{ rating: 1500 }, { rating: 1490 }]);
  key(chart, "End");
  expect(tipOf(chart)?.textContent).toBe("Match 21,490 ▼ 10");
  expect(svgOf(chart)?.classList.contains("links")).toBe(false);
});

test("no points draws nothing and can't be focused", () => {
  const chart = make([]);
  expect(svgOf(chart)?.style.display).toBe("none");
  expect(svgOf(chart)?.hasAttribute("tabindex")).toBe(false);
  chart.points = points;
  expect(svgOf(chart)?.style.display).toBe("");
  expect(svgOf(chart)?.getAttribute("tabindex")).toBe("0");
});

test("a redraw keeps keyboard focus and the point it's on", () => {
  const chart = make();
  svgOf(chart)?.focus();
  key(chart, "End");
  key(chart, "ArrowLeft");
  chart.setAttribute("height", "200");
  expect(chart.shadowRoot?.activeElement).toBe(svgOf(chart));
  expect(tipOf(chart)?.hidden).toBe(false);
  expect(tipOf(chart)?.textContent).toContain("Match #3");
});
