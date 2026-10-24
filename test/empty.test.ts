import { afterEach, expect, test } from "vitest";
import "../src/empty.js";

afterEach(() => {
  document.body.replaceChildren();
});

test("one muted line and an optional action under it", () => {
  const element = document.createElement("gb-empty");
  element.innerHTML = `No matches yet.<a slot="action" href="/host">Host a ranked lobby</a>`;
  document.body.append(element);
  const slots = [...(element.shadowRoot?.querySelectorAll("slot") ?? [])];
  expect(slots.map((slot) => slot.name)).toEqual(["", "action"]);
  const styles = element.shadowRoot?.querySelector("style")?.textContent ?? "";
  expect(styles).toContain("color: var(--muted)");
  expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
