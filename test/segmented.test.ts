import { afterEach, expect, test, vi } from "vitest";
import { GbSegmented } from "../src/segmented.js";

function make(html: string, attributes: Record<string, string> = {}): GbSegmented {
  const element = document.createElement("gb-segmented") as GbSegmented;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = html;
  document.body.append(element);
  return element;
}

const buttons = `<button value="rating">Rating</button><button value="places">Places</button><button value="rounds">Rounds</button>`;

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

afterEach(() => {
  document.body.replaceChildren();
});

test("buttons are a named radio group with the chosen one checked", () => {
  const element = make(buttons, { label: "View", value: "places" });
  expect(element.getAttribute("role")).toBe("radiogroup");
  expect(element.getAttribute("aria-label")).toBe("View");
  expect(element.options.map((o) => o.getAttribute("role"))).toEqual(["radio", "radio", "radio"]);
  expect(element.options.map((o) => o.getAttribute("aria-checked"))).toEqual([
    "false",
    "true",
    "false",
  ]);
  // Roving focus: only the chosen option is in the tab order.
  expect(element.options.map((o) => o.tabIndex)).toEqual([-1, 0, -1]);
  expect(element.value).toBe("places");
});

test("the first option is chosen when value matches none, and the value is the text without one", () => {
  const element = make(`<button>EU</button><button>NA</button>`, { value: "nope" });
  expect(element.value).toBe("EU");
  expect(element.options[0]?.getAttribute("aria-checked")).toBe("true");
});

test("a click chooses an option, updates value and fires change once", () => {
  const element = make(buttons);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  element.options[2]?.click();
  expect(element.value).toBe("rounds");
  expect(element.getAttribute("value")).toBe("rounds");
  expect(onChange).toHaveBeenCalledTimes(1);
  element.options[2]?.click();
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("setting value from the app does not fire change", () => {
  const element = make(buttons);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  element.value = "places";
  expect(element.options[1]?.getAttribute("aria-checked")).toBe("true");
  expect(onChange).not.toHaveBeenCalled();
});

test("arrow keys move the choice and focus, wrapping round", () => {
  const element = make(buttons);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  press(element.options[0] as Element, "ArrowRight");
  expect(element.value).toBe("places");
  expect(document.activeElement).toBe(element.options[1]);
  press(element.options[1] as Element, "ArrowDown");
  press(element.options[2] as Element, "ArrowRight");
  expect(element.value).toBe("rating");
  press(element.options[0] as Element, "ArrowLeft");
  expect(element.value).toBe("rounds");
  press(element.options[2] as Element, "ArrowUp");
  expect(element.value).toBe("places");
  expect(onChange).toHaveBeenCalledTimes(5);
});

test("a disabled option is skipped and never chosen", () => {
  const element = make(
    `<button value="a">A</button><button value="b" disabled>B</button><button value="c">C</button>`,
  );
  press(element.options[0] as Element, "ArrowRight");
  expect(element.value).toBe("c");
  element.options[1]?.click();
  expect(element.value).toBe("c");
});

test("links are a named group that the page marks, with no radio semantics", () => {
  const element = make(
    `<a href="?region=eu" aria-current="true">EU</a><a href="?region=na">NA</a>`,
    {
      label: "Region",
    },
  );
  expect(element.getAttribute("role")).toBe("group");
  expect(element.getAttribute("aria-label")).toBe("Region");
  expect(element.options.map((o) => o.getAttribute("role"))).toEqual([null, null]);
  expect(element.value).toBe("");
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  press(element.options[0] as Element, "ArrowRight");
  expect(onChange).not.toHaveBeenCalled();
});

test("options added later are set up", async () => {
  const element = make(`<button>A</button>`);
  element.append(document.createElement("button"));
  await Promise.resolve();
  expect(element.options[1]?.getAttribute("role")).toBe("radio");
});

test("the chosen option is on raised in full text with the active bar, with no hard-coded colour", () => {
  make(buttons);
  const css = document.adoptedStyleSheets
    .flatMap((sheet) => [...sheet.cssRules])
    .map((rule) => rule.cssText)
    .join("\n");
  expect(css).toContain("aria-checked");
  expect(css).toContain("aria-current");
  expect(css).toMatch(/var\(--panel\)/);
  expect(css).toMatch(/var\(--control-border\)/);
  expect(css).toMatch(/::after \{[^}]*background: var\(--green\)/);
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
