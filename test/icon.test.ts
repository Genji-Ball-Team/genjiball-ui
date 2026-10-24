import { expect, test } from "vitest";
import "../src/icon.js";

function make(attributes: Record<string, string>): HTMLElement {
  const element = document.createElement("gb-icon");
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  document.body.append(element);
  return element;
}

test("draws the named icon, hidden from screen readers without a label", () => {
  const element = make({ name: "matches" });
  expect(element.shadowRoot?.querySelector("svg")).not.toBeNull();
  expect(element.getAttribute("aria-hidden")).toBe("true");
  expect(element.hasAttribute("role")).toBe(false);
});

test("a label makes it an image with that name", () => {
  const element = make({ name: "records", label: "Records" });
  expect(element.getAttribute("role")).toBe("img");
  expect(element.getAttribute("aria-label")).toBe("Records");
  expect(element.hasAttribute("aria-hidden")).toBe(false);
  expect(element.shadowRoot?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});

test("follows changes to name and label", () => {
  const element = make({ name: "live", label: "Live" });
  const before = element.shadowRoot?.innerHTML;
  element.setAttribute("name", "player");
  expect(element.shadowRoot?.innerHTML).not.toBe(before);
  element.removeAttribute("label");
  expect(element.getAttribute("aria-hidden")).toBe("true");
  expect(element.hasAttribute("aria-label")).toBe(false);
});

test("an unknown name draws nothing", () => {
  const element = make({ name: "sparkle" });
  expect(element.shadowRoot?.querySelector("svg")).toBeNull();
});
