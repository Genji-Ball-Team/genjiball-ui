import { afterEach, expect, test } from "vitest";
import { GbChip, tiers } from "../src/chip.js";
import { tokens } from "../src/tokens.js";

function make(attributes: Record<string, string> = {}, text = "Master"): GbChip {
  const element = document.createElement("gb-chip") as GbChip;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.textContent = text;
  document.body.append(element);
  return element;
}

const css = (element: GbChip) => element.shadowRoot?.querySelector("style")?.textContent ?? "";

afterEach(() => {
  document.body.replaceChildren();
});

test("keeps its text in the page, shown through a slot", () => {
  const element = make();
  expect(element.textContent).toBe("Master");
  expect(element.shadowRoot?.querySelector("slot")).not.toBeNull();
});

test("tiers are the t- tokens, lowest first", () => {
  const names = Object.keys(tokens)
    .filter((name) => name.startsWith("t-"))
    .map((name) => name.slice(2));
  expect(tiers).toEqual(names);
});

test("every tier gets its own colour", () => {
  const styles = css(make());
  for (const tier of tiers)
    expect(styles).toContain(`:host([tier="${tier}"]) { --chip: var(--t-${tier}); }`);
});

test("tier and title-chip read back only known values", () => {
  expect(make({ tier: "champion" }).tier).toBe("champion");
  expect(make({ tier: "diamond" }).tier).toBeUndefined();
  expect(make({ "title-chip": "god" }).titleChip).toBe("god");
  expect(make({ "title-chip": "king" }).titleChip).toBeUndefined();
  expect(make().tier).toBeUndefined();
});

test("setting tier or titleChip to undefined removes the attribute", () => {
  const element = make();
  element.tier = "rookie";
  element.titleChip = "demigod";
  expect(element.getAttribute("tier")).toBe("rookie");
  expect(element.getAttribute("title-chip")).toBe("demigod");
  element.tier = undefined;
  element.titleChip = undefined;
  expect(element.hasAttribute("tier")).toBe(false);
  expect(element.hasAttribute("title-chip")).toBe(false);
});

test("only title chips move, and not under reduced motion", () => {
  const styles = css(make());
  const animated = styles.split("}").filter((rule) => /animation: (?!none)/.test(rule));
  expect(animated).toHaveLength(1);
  expect(animated[0]).toContain(":host([title-chip]) {");
  expect(styles).toMatch(
    /prefers-reduced-motion: reduce\) \{ :host\(\[title-chip\]\) \{ animation: none;/,
  );
});

test("colours come from tokens", () => {
  expect(css(make())).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
