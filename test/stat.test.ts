import { afterEach, expect, test } from "vitest";
import { GbStat } from "../src/stat.js";

function make(label: string, value: string): GbStat {
  const element = document.createElement("gb-stat") as GbStat;
  element.setAttribute("label", label);
  element.textContent = value;
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

test("the label, then the number from the page", () => {
  const element = make("Deflects", "1,204");
  const root = element.shadowRoot;
  expect(root?.querySelector(".label")?.textContent).toBe("Deflects");
  expect(root?.querySelector(".value slot")).not.toBeNull();
  expect(element.textContent).toBe("1,204");
  const [first, second] = [...(root?.querySelectorAll("div") ?? [])];
  expect(first?.className).toBe("label");
  expect(second?.className).toBe("value");
});

test("follows a new label", () => {
  const element = make("Deflects", "1,204");
  element.label = "Beams";
  expect(element.shadowRoot?.querySelector(".label")?.textContent).toBe("Beams");
});

test("the number is big, condensed and tabular", () => {
  const styles = make("Win rate", "54%").shadowRoot?.querySelector("style")?.textContent ?? "";
  expect(styles).toContain("font-stretch: var(--display-width)");
  expect(styles).toContain("font-variant-numeric: tabular-nums");
  expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
