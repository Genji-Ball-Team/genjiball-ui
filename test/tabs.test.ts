import { afterEach, expect, test, vi } from "vitest";
import { GbTabs } from "../src/tabs.js";

function make(attributes: Record<string, string> = {}): GbTabs {
  const element = document.createElement("gb-tabs") as GbTabs;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = `<button>Overview</button><button>Matches</button><button>Records</button>
    <section>overview</section><section>matches</section><section>records</section>`;
  document.body.append(element);
  return element;
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

const shown = (element: GbTabs) => element.panels.findIndex((panel) => !panel.hidden);

afterEach(() => {
  document.body.replaceChildren();
});

test("puts the buttons in a named tab list and pairs them with the panels", () => {
  const element = make({ label: "Player stats" });
  const list = element.firstElementChild;
  expect(list?.getAttribute("role")).toBe("tablist");
  expect(list?.getAttribute("aria-label")).toBe("Player stats");
  const { tabs, panels } = element;
  expect(tabs.map((tab) => tab.textContent)).toEqual(["Overview", "Matches", "Records"]);
  expect(panels).toHaveLength(3);
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    expect(tab.getAttribute("role")).toBe("tab");
    expect(tab.type).toBe("button");
    expect(panel?.getAttribute("role")).toBe("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel?.id);
    expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
  });
});

test("shows the first tab, with only it in the tab order", () => {
  const element = make();
  expect(shown(element)).toBe(0);
  expect(element.tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
    "true",
    "false",
    "false",
  ]);
  expect(element.tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  expect(element.panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
});

test("a click shows its tab and fires change", () => {
  const element = make();
  const change = vi.fn();
  element.addEventListener("change", change);
  element.tabs[2]?.click();
  expect(element.selected).toBe(2);
  expect(shown(element)).toBe(2);
  expect(change).toHaveBeenCalledOnce();
  element.tabs[2]?.click();
  expect(change).toHaveBeenCalledOnce();
});

test("setting selected shows that tab without a change event", () => {
  const element = make();
  const change = vi.fn();
  element.addEventListener("change", change);
  element.selected = 1;
  expect(shown(element)).toBe(1);
  expect(element.tabs[1]?.tabIndex).toBe(0);
  expect(change).not.toHaveBeenCalled();
});

test("arrow keys, Home and End move between tabs and wrap round", () => {
  const element = make();
  const [first, second, third] = element.tabs;
  if (!first || !second || !third) throw new Error("no tabs");
  first.focus();
  press(first, "ArrowRight");
  expect(element.selected).toBe(1);
  expect(document.activeElement).toBe(second);
  press(second, "End");
  expect(element.selected).toBe(2);
  press(third, "ArrowRight");
  expect(element.selected).toBe(0);
  press(first, "ArrowLeft");
  expect(element.selected).toBe(2);
  press(third, "Home");
  expect(element.selected).toBe(0);
  expect(document.activeElement).toBe(first);
});

test("skips a disabled tab", () => {
  const element = make();
  const [first, second] = element.tabs;
  if (!first || !second) throw new Error("no tabs");
  second.disabled = true;
  first.focus();
  press(first, "ArrowRight");
  expect(element.selected).toBe(2);
  second.click();
  expect(element.selected).toBe(2);
});

test("a selected index past the end shows the last tab", () => {
  const element = make({ selected: "7" });
  expect(shown(element)).toBe(2);
});

test("takes in tabs and panels added later", async () => {
  const element = make();
  const tab = document.createElement("button");
  tab.textContent = "Deflects";
  const panel = document.createElement("section");
  element.append(tab, panel);
  await new Promise((resolve) => setTimeout(resolve));
  expect(element.tabs).toHaveLength(4);
  expect(element.tabs[3]).toBe(tab);
  expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  expect(panel.hidden).toBe(true);
});
