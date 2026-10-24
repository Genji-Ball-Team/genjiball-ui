import { afterEach, expect, test } from "vitest";
import { type GbSkeleton, skeletonDelayMs } from "../src/skeleton.js";

function make(block = false): GbSkeleton {
  const element = document.createElement("gb-skeleton") as GbSkeleton;
  element.toggleAttribute("block", block);
  document.body.append(element);
  return element;
}

const css = (element: GbSkeleton) => element.shadowRoot?.querySelector("style")?.textContent ?? "";

afterEach(() => {
  document.body.replaceChildren();
});

test("is hidden from screen readers", () => {
  expect(make().getAttribute("aria-hidden")).toBe("true");
});

test("a block keeps its children, laid out by the app", () => {
  const block = make(true);
  block.append(document.createElement("gb-skeleton"));
  expect(block.shadowRoot?.querySelector("slot")).not.toBeNull();
  expect(block.children).toHaveLength(1);
});

test("shows only after the delay", () => {
  expect(skeletonDelayMs).toBe(300);
  const styles = css(make());
  expect(styles).toContain(
    "@keyframes appear { from { visibility: hidden; } to { visibility: visible; } }",
  );
  expect(styles).toContain(`animation: appear 0s ${skeletonDelayMs}ms both, pulse`);
});

test("lines pulse, blocks don't, and nothing pulses under reduced motion", () => {
  const styles = css(make());
  expect(styles).toMatch(/:host\(\[block\]\) \{[^}]*animation: appear 0s 300ms both;/);
  expect(styles).toMatch(
    /prefers-reduced-motion: reduce\) \{ :host \{ animation: appear 0s 300ms both; \} \}/,
  );
});

test("colours come from tokens", () => {
  expect(css(make())).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
