import { afterEach, expect, test } from "vitest";
import { GbPager } from "../src/pager.js";

function make(attributes: Record<string, string>): GbPager {
  const element = document.createElement("gb-pager") as GbPager;
  element.setAttribute("href", "/matches?page={page}");
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  document.body.append(element);
  return element;
}

const links = (element: Element) => [...element.querySelectorAll("a")];

afterEach(() => {
  document.body.replaceChildren();
});

test("a navigation landmark with both links and the page text between", () => {
  const element = make({ page: "2", pages: "9" });
  expect(element.getAttribute("role")).toBe("navigation");
  expect(element.getAttribute("aria-label")).toBe("Pages");
  expect(element.textContent).toBe("←PreviousPage 2 of 9Next→");
  const [prev, next] = links(element);
  expect(prev?.getAttribute("href")).toBe("/matches?page=1");
  expect(next?.getAttribute("href")).toBe("/matches?page=3");
  expect(prev?.hidden).toBe(false);
  expect(next?.hidden).toBe(false);
  expect(prev?.textContent).toBe("←Previous");
  expect(prev?.querySelector("[aria-hidden]")?.textContent).toBe("←");
});

test("keeps an aria-label the app set", () => {
  const element = document.createElement("gb-pager");
  element.setAttribute("aria-label", "Tourney pages");
  document.body.append(element);
  expect(element.getAttribute("aria-label")).toBe("Tourney pages");
});

test("on the first page Previous is hidden but still in the layout", () => {
  const element = make({ page: "1", pages: "9" });
  const [prev, next] = links(element);
  expect(prev?.hidden).toBe(true);
  expect(next?.hidden).toBe(false);
  expect(element.children).toHaveLength(3);
  const css = document.adoptedStyleSheets
    .flatMap((sheet) => [...sheet.cssRules])
    .map((rule) => rule.cssText)
    .join("\n");
  expect(css).toMatch(/a\[hidden\] \{[^}]*visibility: hidden/);
});

test("on the last page Next is hidden", () => {
  const [prev, next] = links(make({ page: "9", pages: "9" }));
  expect(prev?.hidden).toBe(false);
  expect(next?.hidden).toBe(true);
});

test("a single page shows nothing", () => {
  const element = make({ page: "1", pages: "1" });
  expect(element.children).toHaveLength(0);
});

test("without a page count, more shows Next and the text has no total", () => {
  const element = make({ page: "3", more: "" });
  expect(element.textContent).toContain("Page 3");
  expect(element.textContent).not.toContain("of");
  expect(links(element)[1]?.hidden).toBe(false);
  element.removeAttribute("more");
  expect(links(element)[1]?.hidden).toBe(true);
});

test("follows its attributes and clamps the page", () => {
  const element = make({ page: "2", pages: "9" });
  element.page = 5;
  expect(element.textContent).toContain("Page 5 of 9");
  expect(links(element)[1]?.getAttribute("href")).toBe("/matches?page=6");
  element.page = 40;
  expect(element.page).toBe(9);
  element.setAttribute("page", "junk");
  expect(element.page).toBe(1);
  expect(element.url(4)).toBe("/matches?page=4");
});
