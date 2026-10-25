import { afterEach, expect, test } from "vitest";
import { GbFormRow } from "../src/form-row.js";

function make(attributes: Record<string, string> = {}): GbFormRow {
  const element = document.createElement("gb-form-row") as GbFormRow;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

test("one link square per result, in the given order, each with its place and full label", () => {
  const element = make();
  element.results = [
    { place: 3, players: 6, href: "/match?id=811", label: "3rd of 6, round 2 of match #811" },
    { place: 1, players: 6, href: "/match?id=812", label: "Won round 3 of match #812" },
  ];
  const list = element.querySelector("ul");
  expect(list?.getAttribute("aria-label")).toBe("Recent form");
  const links = [...element.querySelectorAll("a")];
  expect(links.map((a) => a.textContent)).toEqual(["3", "1"]);
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/match?id=811", "/match?id=812"]);
  expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
    "3rd of 6, round 2 of match #811",
    "Won round 3 of match #812",
  ]);
  expect(links.map((a) => a.title)).toEqual(links.map((a) => a.getAttribute("aria-label")));
});

test("only a first place is marked as a win", () => {
  const element = make();
  element.results = [1, 2, 6].map((place) => ({ place, players: 6, href: `/m?${place}` }));
  expect([...element.querySelectorAll("a")].map((a) => a.hasAttribute("data-won"))).toEqual([
    true,
    false,
    false,
  ]);
});

test("a result without a label gets one from its place", () => {
  const element = make();
  element.results = [1, 2, 3, 11, 22].map((place) => ({ place, players: 12, href: "/m" }));
  expect([...element.querySelectorAll("a")].map((a) => a.getAttribute("aria-label"))).toEqual([
    "Won",
    "2nd of 12",
    "3rd of 12",
    "11th of 12",
    "22nd of 12",
  ]);
});

test("results set before it is connected show once it is", () => {
  const element = document.createElement("gb-form-row") as GbFormRow;
  element.results = [{ place: 2, players: 4, href: "/m" }];
  document.body.append(element);
  expect(element.querySelectorAll("a")).toHaveLength(1);
});

test("with no results it shows one muted line, which the app can reword", () => {
  const element = make();
  expect(element.querySelector("ul")).toBeNull();
  expect(element.textContent).toBe("No matches yet.");
  element.setAttribute("empty", "No rated rounds yet.");
  expect(element.textContent).toBe("No rated rounds yet.");
  element.results = [{ place: 1, players: 2, href: "/m" }];
  expect(element.querySelector("p")).toBeNull();
});

test("squares are 24px with a 40px tap target, the win on up with dark text", () => {
  make();
  const css = document.adoptedStyleSheets
    .flatMap((sheet) => [...sheet.cssRules])
    .map((rule) => rule.cssText)
    .join("\n");
  expect(css).toMatch(/inline-size: 24px/);
  expect(css).toMatch(/pointer: coarse[\s\S]*inline-size: 40px/);
  expect(css).toMatch(/data-won\] \{[^}]*background: var\(--up\)[^}]*color: var\(--bg\)/);
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
