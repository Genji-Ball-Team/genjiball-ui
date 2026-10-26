import { afterEach, expect, test, vi } from "vitest";
import { GbChipSelect } from "../src/chip-select.js";

function make(html: string, attributes: Record<string, string> = {}): GbChipSelect {
  const element = document.createElement("gb-chip-select") as GbChipSelect;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = html;
  document.body.append(element);
  return element;
}

const tiers = `<button value="grandmaster" tier="grandmaster">Grandmaster</button><button value="master" tier="master">Master</button><button value="none">No tier</button>`;

afterEach(() => {
  document.body.replaceChildren();
});

test("the options are toggle buttons in a named group, the picked ones pressed", () => {
  const element = make(tiers, { label: "Tier", value: "none,grandmaster" });
  expect(element.getAttribute("role")).toBe("group");
  expect(element.getAttribute("aria-label")).toBe("Tier");
  expect(element.options.map((o) => o.type)).toEqual(["button", "button", "button"]);
  expect(element.options.map((o) => o.getAttribute("aria-pressed"))).toEqual([
    "true",
    "false",
    "true",
  ]);
  // In the options' order, not the attribute's.
  expect(element.values).toEqual(["grandmaster", "none"]);
});

test("nothing is picked without a value, and an option's value is its text without one", () => {
  const element = make(`<button>EU</button><button>NA</button>`);
  expect(element.values).toEqual([]);
  element.values = ["NA"];
  expect(element.options[1]?.getAttribute("aria-pressed")).toBe("true");
});

test("values the options don't have are left out", () => {
  const element = make(tiers, { value: "master,sovereign" });
  expect(element.values).toEqual(["master"]);
});

test("a click toggles an option and fires change each time", () => {
  const element = make(tiers);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  element.options[1]?.click();
  element.options[0]?.click();
  expect(element.values).toEqual(["grandmaster", "master"]);
  expect(element.getAttribute("value")).toBe("grandmaster,master");
  element.options[1]?.click();
  expect(element.values).toEqual(["grandmaster"]);
  expect(element.options[1]?.getAttribute("aria-pressed")).toBe("false");
  expect(onChange).toHaveBeenCalledTimes(3);
});

test("setting values from the app does not fire change", () => {
  const element = make(tiers);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  element.values = ["master"];
  expect(element.options[1]?.getAttribute("aria-pressed")).toBe("true");
  expect(onChange).not.toHaveBeenCalled();
});

test("a disabled option can't be toggled", () => {
  const element = make(`<button value="a">A</button><button value="b" disabled>B</button>`);
  const onChange = vi.fn();
  element.addEventListener("change", onChange);
  element.options[1]?.click();
  expect(element.values).toEqual([]);
  expect(onChange).not.toHaveBeenCalled();
});

test("options added later are set up too", async () => {
  const element = make("", { value: "b" });
  element.insertAdjacentHTML(
    "beforeend",
    `<button value="a">A</button><button value="b">B</button>`,
  );
  await Promise.resolve();
  expect(element.options.map((o) => o.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
});
