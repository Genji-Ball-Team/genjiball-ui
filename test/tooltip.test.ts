import { afterEach, beforeEach, expect, test, vi } from "vitest";
import "../src/button.js";
import { GbTooltip, showDelayMs } from "../src/tooltip.js";

function make(text = "Copies the code with rank tags", inner = "<button>Copy</button>"): GbTooltip {
  const element = document.createElement("gb-tooltip") as GbTooltip;
  element.setAttribute("text", text);
  element.innerHTML = inner;
  document.body.append(element);
  return element;
}

const tip = (element: GbTooltip) => element.querySelector<HTMLElement>('[role="tooltip"]');
const hover = (element: Element, type: "pointerenter" | "pointerleave", pointerType = "mouse") =>
  element.dispatchEvent(new PointerEvent(type, { pointerType }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

test("describes the control with the tooltip", () => {
  const element = make();
  expect(tip(element)?.textContent).toBe("Copies the code with rank tags");
  expect(element.trigger?.getAttribute("aria-describedby")).toBe(tip(element)?.id);
  expect(tip(element)?.hidden).toBe(true);
});

test("doesn't describe a control with its own name", () => {
  const element = make("Copy", '<button aria-label="Copy">⧉</button>');
  expect(element.trigger?.hasAttribute("aria-describedby")).toBe(false);
});

test("a <gb-button> gets the text as its description", () => {
  const element = make("Copies the code", "<gb-button>Copy</gb-button>");
  const inner = element.trigger?.shadowRoot?.querySelector("button");
  expect(inner?.getAttribute("aria-description")).toBe("Copies the code");
});

test("shows after resting on the control, and hides after leaving it", () => {
  const element = make();
  hover(element, "pointerenter");
  vi.advanceTimersByTime(showDelayMs - 1);
  expect(element.open).toBe(false);
  vi.advanceTimersByTime(1);
  expect(element.open).toBe(true);
  hover(element, "pointerleave");
  expect(element.open).toBe(true);
  vi.advanceTimersByTime(200);
  expect(element.open).toBe(false);
});

test("coming back before it hides keeps it", () => {
  const element = make();
  element.show();
  hover(element, "pointerleave");
  vi.advanceTimersByTime(50);
  hover(element, "pointerenter");
  vi.advanceTimersByTime(500);
  expect(element.open).toBe(true);
});

test("never on touch", () => {
  const element = make();
  hover(element, "pointerenter", "touch");
  vi.advanceTimersByTime(1000);
  expect(element.open).toBe(false);
});

test("shows on keyboard focus and hides on blur", () => {
  const element = make();
  element.trigger?.focus();
  expect(element.open).toBe(true);
  element.trigger?.blur();
  expect(element.open).toBe(false);
});

test("Escape hides it and goes no further", () => {
  const element = make();
  const outer = vi.fn();
  document.body.addEventListener("keydown", outer);
  element.show();
  element.trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(element.open).toBe(false);
  expect(outer).not.toHaveBeenCalled();
});

test("a click hides it", () => {
  const element = make();
  element.show();
  element.trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  expect(element.open).toBe(false);
});

test("no text, no tooltip", () => {
  const element = make("");
  element.show();
  expect(element.open).toBe(false);
});
