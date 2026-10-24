import { afterEach, expect, test } from "vitest";
import "../src/nav.js";

afterEach(() => {
  document.body.replaceChildren();
});

test("a navigation landmark of plain links", () => {
  const element = document.createElement("gb-nav");
  element.setAttribute("aria-label", "Main");
  element.innerHTML = `<a href="/" aria-current="page"><gb-icon name="leaderboard"></gb-icon>Leaderboard</a><a href="/matches">Matches</a>`;
  document.body.append(element);
  expect(element.getAttribute("role")).toBe("navigation");
  expect(element.shadowRoot).toBeNull();
  expect(element.querySelectorAll("a")).toHaveLength(2);
});

test("keeps a role the app set", () => {
  const element = document.createElement("gb-nav");
  element.setAttribute("role", "none");
  document.body.append(element);
  expect(element.getAttribute("role")).toBe("none");
});

test("the current link is active, its icon green, and green marks it without an icon", () => {
  document.body.append(document.createElement("gb-nav"));
  const css = document.adoptedStyleSheets
    .flatMap((sheet) => [...sheet.cssRules])
    .map((rule) => rule.cssText)
    .join("\n");
  expect(css).toContain("aria-current");
  expect(css).toMatch(/gb-icon \{[^}]*color: var\(--green\)/);
  expect(css).toMatch(/::after \{[^}]*background: var\(--green\)/);
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
