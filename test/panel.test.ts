import { afterEach, expect, test } from "vitest";
import { GbPanel } from "../src/panel.js";

function make(attributes: Record<string, string> = {}): GbPanel {
  const element = document.createElement("gb-panel") as GbPanel;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = "<p>Content</p>";
  document.body.append(element);
  return element;
}

const label = (element: GbPanel) => element.shadowRoot?.querySelector(".label");
const css = (element: GbPanel) => element.shadowRoot?.querySelector("style")?.textContent ?? "";

afterEach(() => {
  document.body.replaceChildren();
});

test("keeps its content in the page", () => {
  const element = make();
  expect(element.shadowRoot?.querySelector("slot")).not.toBeNull();
  expect(element.querySelector("p")?.textContent).toBe("Content");
});

test("a label is a heading, level 2 by default", () => {
  const element = make({ label: "Rating" });
  expect(label(element)?.textContent).toBe("Rating");
  expect(label(element)?.getAttribute("role")).toBe("heading");
  expect(label(element)?.getAttribute("aria-level")).toBe("2");
  element.setAttribute("level", "3");
  expect(label(element)?.getAttribute("aria-level")).toBe("3");
  element.setAttribute("level", "9");
  expect(label(element)?.getAttribute("aria-level")).toBe("2");
});

test("no label, no empty heading", () => {
  const element = make({ label: "Rating" });
  element.label = "";
  expect(element.hasAttribute("label")).toBe(false);
  expect(label(element)?.textContent).toBe("");
  expect(label(element)?.hasAttribute("role")).toBe(false);
});

test("flat: a background step and a line, never a shadow", () => {
  const styles = css(make());
  expect(styles).toContain("border: 1px solid var(--line)");
  expect(styles).toContain("background: var(--panel)");
  expect(styles).toMatch(/:host\(\[raised\]\) \{[^}]*background: var\(--raised\)/);
  expect(styles).not.toContain("shadow");
  expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
