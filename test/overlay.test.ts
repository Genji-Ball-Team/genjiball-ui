import { expect, test } from "vitest";
import { margin, place } from "../src/overlay.js";

const view = { width: 1000, height: 800 };
const size = { width: 200, height: 100 };
const anchor = (left: number, top: number, width = 80, height = 32) => ({
  left,
  top,
  width,
  height,
});

test("goes below the anchor, lined up with its start edge", () => {
  expect(place(anchor(100, 100), size, view)).toEqual({ x: 100, y: 138, side: "bottom" });
});

test("lines up with the right edge in a right-to-left page", () => {
  expect(place(anchor(500, 100), size, view, { rtl: true }).x).toBe(380);
});

test("centres on the anchor when asked", () => {
  expect(place(anchor(500, 100), size, view, { align: "center" }).x).toBe(440);
});

test("goes above when only that fits", () => {
  expect(place(anchor(100, 700), size, view)).toEqual({ x: 100, y: 594, side: "top" });
});

test("lines up with the end edge when the start edge doesn't fit", () => {
  expect(place(anchor(880, 100), size, view)).toEqual({ x: 760, y: 138, side: "bottom" });
  expect(place(anchor(40, 100), size, view, { rtl: true }).x).toBe(40);
});

test("stays inside the window at the edges", () => {
  expect(place(anchor(1100, 100), size, view).x).toBe(view.width - margin - size.width);
  expect(place(anchor(-40, 100), size, view, { align: "center" }).x).toBe(margin);
});

test("when it fits on neither side, takes the roomier one and stays on screen", () => {
  const tall = { width: 200, height: 500 };
  const nearTop = place(anchor(100, 200), tall, view);
  expect(nearTop.side).toBe("bottom");
  expect(nearTop.y + tall.height).toBeLessThanOrEqual(view.height - margin);
  const nearBottom = place(anchor(100, 560), tall, view);
  expect(nearBottom.side).toBe("top");
  expect(nearBottom.y).toBeGreaterThanOrEqual(margin);
});

test("keeps the top in view when it's taller than the window", () => {
  expect(place(anchor(100, 100), { width: 200, height: 2000 }, view).y).toBe(margin);
});
