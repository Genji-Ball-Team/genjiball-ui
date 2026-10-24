import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { GbCount } from "../src/count.js";
import "../src/count.js";
import type { GbSlash } from "../src/slash.js";
import "../src/slash.js";

let reduced = false;

beforeEach(() => {
  reduced = false;
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) => ({ matches: reduced && query.includes("reduce") }) as MediaQueryList,
  );
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function make(content = ""): GbSlash {
  const element = document.createElement("gb-slash") as GbSlash;
  element.innerHTML = content;
  document.body.append(element);
  return element;
}

const line = (element: GbSlash) => element.shadowRoot?.querySelector(".line");
const css = (element: GbSlash) => element.shadowRoot?.querySelector("style")?.textContent ?? "";

test("does nothing on page load", () => {
  expect(line(make())?.classList.contains("play")).toBe(false);
});

test("play() plays it once, and a second play restarts it", () => {
  const element = make();
  element.play();
  expect(line(element)?.classList.contains("play")).toBe(true);
  element.play();
  expect(line(element)?.classList.contains("play")).toBe(true);
  line(element)?.dispatchEvent(new Event("animationend"));
  expect(line(element)?.classList.contains("play")).toBe(false);
});

test("plays when a count inside it changes", () => {
  const element = make(`<p><gb-count value="1818"></gb-count></p>`);
  const count = element.querySelector("gb-count") as GbCount;
  expect(line(element)?.classList.contains("play")).toBe(false);
  count.value = 1842;
  expect(line(element)?.classList.contains("play")).toBe(true);
});

test("is off under reduced motion", () => {
  reduced = true;
  const element = make();
  element.play();
  expect(line(element)?.classList.contains("play")).toBe(false);
  expect(css(element)).toContain(
    "@media (prefers-reduced-motion: reduce) { .line.play { animation: none; } }",
  );
});

test("keeps its content and hides the line from screen readers", () => {
  const element = make("<p>1,842</p>");
  expect(element.shadowRoot?.querySelector("slot")).not.toBeNull();
  expect(element.shadowRoot?.querySelector(".cut")?.getAttribute("aria-hidden")).toBe("true");
});

test("plays once at the slash tokens, never loops, never glows", () => {
  const styles = css(make());
  expect(styles).toContain("animation: slash var(--slash-duration) var(--slash-ease) forwards;");
  expect(styles).not.toMatch(/infinite|box-shadow|filter/);
});

test("colours come from tokens", () => {
  expect(css(make())).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
