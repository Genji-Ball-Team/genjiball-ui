import { afterEach, expect, test, vi } from "vitest";
import "../src/button.js";
import { GbMenu } from "../src/menu.js";

function make(attributes: Record<string, string> = {}): GbMenu {
  const element = document.createElement("gb-menu") as GbMenu;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = `<button>Actions</button><div>
    <button>Copy link</button>
    <button disabled>Move to NA</button>
    <a href="#admin">Open in admin</a>
    <hr />
    <button data-danger>Delete match</button>
  </div>`;
  document.body.append(element);
  return element;
}

const trigger = (element: GbMenu) => element.trigger as HTMLElement;
const text = (node: Element | null) => node?.textContent.trim();

function press(target: Element | null, key: string): void {
  target?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.replaceChildren();
});

test("gives the menu, its items and the divider their roles", () => {
  const element = make({ label: "Match actions" });
  const panel = element.panel;
  expect(panel?.getAttribute("role")).toBe("menu");
  expect(panel?.getAttribute("aria-label")).toBe("Match actions");
  expect(element.items.map((item) => item.getAttribute("role"))).toEqual([
    "menuitem",
    "menuitem",
    "menuitem",
    "menuitem",
  ]);
  expect(element.items.map((item) => item.tabIndex)).toEqual([-1, -1, -1, -1]);
  expect(panel?.querySelector("hr")?.getAttribute("role")).toBe("separator");
  expect(trigger(element).getAttribute("aria-haspopup")).toBe("menu");
});

test("without a label, the button names the menu", () => {
  const element = make();
  expect(element.panel?.getAttribute("aria-labelledby")).toBe(trigger(element).id);
});

test("a click opens it on the first item", () => {
  const element = make();
  trigger(element).click();
  expect(element.open).toBe(true);
  expect(text(document.activeElement)).toBe("Copy link");
});

test("↓ on the button opens it on the first item and ↑ on the last", () => {
  const element = make();
  press(trigger(element), "ArrowDown");
  expect(text(document.activeElement)).toBe("Copy link");
  element.hide();
  press(trigger(element), "ArrowUp");
  expect(text(document.activeElement)).toBe("Delete match");
});

test("arrows, Home and End move through the items, skipping disabled ones", () => {
  const element = make();
  element.show();
  press(document.activeElement, "ArrowDown");
  expect(text(document.activeElement)).toBe("Open in admin");
  press(document.activeElement, "ArrowDown");
  expect(text(document.activeElement)).toBe("Delete match");
  press(document.activeElement, "ArrowDown");
  expect(text(document.activeElement)).toBe("Copy link");
  press(document.activeElement, "ArrowUp");
  expect(text(document.activeElement)).toBe("Delete match");
  press(document.activeElement, "Home");
  expect(text(document.activeElement)).toBe("Copy link");
  press(document.activeElement, "End");
  expect(text(document.activeElement)).toBe("Delete match");
});

test("a letter goes to the next item starting with it", () => {
  const element = make();
  element.show();
  press(document.activeElement, "d");
  expect(text(document.activeElement)).toBe("Delete match");
  press(document.activeElement, "O");
  expect(text(document.activeElement)).toBe("Open in admin");
});

test("an item's click runs, then the menu fires select, closes and focuses the button", () => {
  const element = make();
  const item = element.items[0];
  const order: string[] = [];
  item?.addEventListener("click", () => order.push("item"));
  element.addEventListener("select", (event) => {
    order.push("select");
    expect((event as CustomEvent).detail).toBe(item);
  });
  element.show();
  item?.click();
  expect(order).toEqual(["item", "select"]);
  expect(element.open).toBe(false);
  expect(document.activeElement).toBe(trigger(element));
});

test("a disabled item does nothing", () => {
  const element = make();
  const select = vi.fn();
  element.addEventListener("select", select);
  element.show();
  element.items[1]?.click();
  expect(select).not.toHaveBeenCalled();
  expect(element.open).toBe(true);
});

test("Escape closes it onto the button and Tab closes it where focus goes", () => {
  const element = make();
  element.show();
  press(document.activeElement, "Escape");
  expect(element.open).toBe(false);
  expect(document.activeElement).toBe(trigger(element));
  element.show();
  press(document.activeElement, "Tab");
  expect(element.open).toBe(false);
});

test("a <gb-button> opener gets the state on its real button", () => {
  const element = document.createElement("gb-menu") as GbMenu;
  element.innerHTML = `<gb-button aria-label="More actions">⋯</gb-button><div><button>Copy link</button></div>`;
  document.body.append(element);
  const inner = trigger(element).shadowRoot?.querySelector("button");
  expect(inner?.getAttribute("aria-haspopup")).toBe("menu");
  expect(inner?.getAttribute("aria-expanded")).toBe("false");
  expect(inner?.getAttribute("aria-label")).toBe("More actions");
  element.show();
  expect(inner?.getAttribute("aria-expanded")).toBe("true");
});
