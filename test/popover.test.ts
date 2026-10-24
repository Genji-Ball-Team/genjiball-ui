import { afterEach, expect, test, vi } from "vitest";
import { GbPopover } from "../src/popover.js";

function make(): GbPopover {
  const element = document.createElement("gb-popover") as GbPopover;
  element.innerHTML = `<button>Filters</button><div aria-label="Filters"><input name="name" /><button>Apply</button></div>`;
  document.body.append(
    element,
    Object.assign(document.createElement("button"), { textContent: "Outside" }),
  );
  return element;
}

const trigger = (element: GbPopover) => element.trigger as HTMLButtonElement;
const panel = (element: GbPopover) => element.panel as HTMLElement;

afterEach(() => {
  document.body.replaceChildren();
});

test("starts closed, with the button saying what it opens", () => {
  const element = make();
  expect(element.open).toBe(false);
  expect(panel(element).hidden).toBe(true);
  expect(panel(element).getAttribute("role")).toBe("dialog");
  expect(trigger(element).getAttribute("aria-haspopup")).toBe("dialog");
  expect(trigger(element).getAttribute("aria-expanded")).toBe("false");
  expect(trigger(element).getAttribute("aria-controls")).toBe(panel(element).id);
});

test("a click on the button opens it, focuses the first control and fires open", () => {
  const element = make();
  const opened = vi.fn();
  element.addEventListener("open", opened);
  trigger(element).click();
  expect(element.open).toBe(true);
  expect(panel(element).hidden).toBe(false);
  expect(trigger(element).getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(panel(element).querySelector("input"));
  expect(opened).toHaveBeenCalledOnce();
});

test("a second click closes it", () => {
  const element = make();
  trigger(element).click();
  trigger(element).click();
  expect(element.open).toBe(false);
  expect(panel(element).hidden).toBe(true);
});

test("Escape closes it, puts focus back on the button and fires close", () => {
  const element = make();
  const closed = vi.fn();
  element.addEventListener("close", closed);
  element.show();
  const input = panel(element).querySelector("input");
  input?.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
  );
  expect(element.open).toBe(false);
  expect(document.activeElement).toBe(trigger(element));
  expect(closed).toHaveBeenCalledOnce();
});

test("a click outside closes it without moving focus to the button", () => {
  const element = make();
  element.show();
  const outside = document.body.lastElementChild as HTMLButtonElement;
  outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
  expect(element.open).toBe(false);
  expect(document.activeElement).not.toBe(trigger(element));
});

test("a click inside keeps it open", () => {
  const element = make();
  element.show();
  const input = panel(element).querySelector("input");
  input?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
  input?.click();
  expect(element.open).toBe(true);
});

test("focus moving out closes it", () => {
  const element = make();
  element.show();
  const outside = document.body.lastElementChild as HTMLButtonElement;
  panel(element).dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }),
  );
  expect(element.open).toBe(false);
});

test("is placed next to the button", () => {
  const element = make();
  element.show();
  expect(panel(element).style.top).toMatch(/px$/);
  expect(panel(element).dataset.side).toMatch(/^(top|bottom)$/);
});

test("closes when it leaves the page", () => {
  const element = make();
  element.show();
  element.remove();
  expect(element.open).toBe(false);
});
