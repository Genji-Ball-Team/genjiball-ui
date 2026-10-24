import { afterEach, expect, test } from "vitest";
import { type GbAvatar, initial } from "../src/avatar.js";

function make(attributes: Record<string, string>): GbAvatar {
  const element = document.createElement("gb-avatar") as GbAvatar;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

test("the initial is the first character as a person sees it", () => {
  expect(initial("kyoryu")).toBe("K");
  expect(initial("  élan")).toBe("É");
  expect(initial("👍🏽 thumbs")).toBe("👍🏽");
  expect(initial("")).toBe("");
});

test("the grey initial when there's no picture", () => {
  const element = make({ name: "Kyoryu" });
  expect(element.shadowRoot?.querySelector(".initial")?.textContent).toBe("K");
  expect(element.shadowRoot?.querySelector("img")).toBeNull();
});

test("the picture when there is one, and the initial again if it fails", () => {
  const element = make({ name: "Kyoryu", src: "https://example.com/a.png" });
  const img = element.shadowRoot?.querySelector("img");
  expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
  expect(img?.alt).toBe("");
  img?.dispatchEvent(new Event("error"));
  expect(element.shadowRoot?.querySelector("img")).toBeNull();
  expect(element.shadowRoot?.querySelector(".initial")?.textContent).toBe("K");
  element.setAttribute("src", "https://example.com/b.png");
  expect(element.shadowRoot?.querySelector("img")?.getAttribute("src")).toBe(
    "https://example.com/b.png",
  );
  expect(element.shadowRoot?.querySelectorAll("img, .initial")).toHaveLength(1);
});

test("decorative, sized by `size`, and hidden until the app turns avatars on", () => {
  const element = make({ name: "Kyoryu", size: "48" });
  expect(element.getAttribute("aria-hidden")).toBe("true");
  expect(element.style.getPropertyValue("--gb-avatar-size")).toBe("48px");
  element.removeAttribute("size");
  expect(element.style.getPropertyValue("--gb-avatar-size")).toBe("");
  const styles = element.shadowRoot?.querySelector("style")?.textContent ?? "";
  expect(styles).toContain("display: var(--gb-avatar-display, none)");
  expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
