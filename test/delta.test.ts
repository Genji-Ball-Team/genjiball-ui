import { afterEach, expect, test } from "vitest";
import { GbDelta } from "../src/delta.js";

function make(value?: string): GbDelta {
  const element = document.createElement("gb-delta") as GbDelta;
  if (value !== undefined) element.setAttribute("value", value);
  document.body.append(element);
  return element;
}

const parts = (element: GbDelta) =>
  [...(element.shadowRoot?.querySelectorAll("span") ?? [])].map((span) => span.textContent);

afterEach(() => {
  document.body.replaceChildren();
});

test("a gain shows ▲ in up, and reads as up", () => {
  const element = make("24");
  expect(element.getAttribute("direction")).toBe("up");
  expect(parts(element)).toEqual(["▲ 24", "up 24"]);
});

test("a loss shows ▼ with the amount, not the sign", () => {
  const element = make("-1204");
  expect(element.getAttribute("direction")).toBe("down");
  expect(parts(element)).toEqual(["▼ 1,204", "down 1,204"]);
});

test("zero is a muted dash", () => {
  const element = make("0");
  expect(element.getAttribute("direction")).toBe("none");
  expect(parts(element)).toEqual(["–", "no change"]);
});

test("no number shows nothing", () => {
  for (const value of [undefined, "", "abc"]) {
    const element = make(value);
    expect(element.value).toBeUndefined();
    expect(parts(element)).toEqual(["", ""]);
  }
});

test("follows the value property", () => {
  const element = make("5");
  element.value = -3;
  expect(element.getAttribute("value")).toBe("-3");
  expect(parts(element)[0]).toBe("▼ 3");
  element.value = undefined;
  expect(element.hasAttribute("value")).toBe(false);
});

test("only the arrow text is hidden from screen readers", () => {
  const [shown, spoken] = make("1").shadowRoot?.querySelectorAll("span") ?? [];
  expect(shown?.getAttribute("aria-hidden")).toBe("true");
  expect(spoken?.hasAttribute("aria-hidden")).toBe(false);
});
