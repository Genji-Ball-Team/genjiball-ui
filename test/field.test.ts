import { afterEach, expect, test } from "vitest";
import { GbField } from "../src/field.js";

function make(control: string, attributes: Record<string, string> = {}): GbField {
  const element = document.createElement("gb-field") as GbField;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.innerHTML = control;
  document.body.append(element);
  return element;
}

function find(element: GbField, selector: string): Element {
  const found = element.querySelector(selector);
  if (!found) throw new Error(`no ${selector} in the field`);
  return found;
}

afterEach(() => {
  document.body.replaceChildren();
});

test("puts a real label above the control and points it at the control", () => {
  const element = make(`<input name="battletag">`, { label: "BattleTag" });
  const label = find(element, "label") as HTMLLabelElement;
  const input = find(element, "input") as HTMLInputElement;
  expect(label.textContent).toBe("BattleTag");
  expect(input.id).not.toBe("");
  expect(label.htmlFor).toBe(input.id);
  expect(element.firstElementChild).toBe(label);
  expect(element.control).toBe(input);
});

test("keeps the control's own id", () => {
  const element = make(`<input id="token">`, { label: "Host token" });
  expect((find(element, "label") as HTMLLabelElement).htmlFor).toBe("token");
});

test("gives every field its own id", () => {
  const first = make(`<input>`, { label: "A" });
  const second = make(`<input>`, { label: "B" });
  expect(first.control?.id).not.toBe(second.control?.id);
});

test("the error goes under the control with ⚠ and marks it invalid", () => {
  const element = make(`<input aria-describedby="hint">`, { label: "Host token" });
  const input = find(element, "input");
  const error = find(element, ".gb-field-error");
  expect(error.textContent).toBe("");
  expect(input.hasAttribute("aria-invalid")).toBe(false);
  element.error = "This token isn't valid. Copy it again from the site.";
  expect(error.textContent).toBe("⚠ This token isn't valid. Copy it again from the site.");
  expect(element.lastElementChild).toBe(error);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toBe(`hint ${error.id}`);
  element.error = "";
  expect(element.hasAttribute("error")).toBe(false);
  expect(error.textContent).toBe("");
  expect(input.hasAttribute("aria-invalid")).toBe(false);
  expect(input.getAttribute("aria-describedby")).toBe("hint");
});

test("a select gets a chevron, a checkbox a tick, a switch an empty knob, a text field nothing", () => {
  const mark = (element: GbField) => element.querySelector(".gb-field-mark");
  expect(mark(make(`<input>`, { label: "Name" }))).toBeNull();
  expect(mark(make(`<textarea></textarea>`, { label: "Notes" }))).toBeNull();
  const select = make(`<select><option>EU</option></select>`, { label: "Region" });
  expect(find(select, "select").nextElementSibling).toBe(mark(select));
  expect(mark(select)?.querySelector("svg")).not.toBeNull();
  const checkbox = make(`<input type="checkbox">`, { label: "Upload automatically" });
  expect(mark(checkbox)?.querySelector("svg")).not.toBeNull();
  expect(mark(checkbox)?.getAttribute("aria-hidden")).toBe("true");
  const toggle = make(`<input type="checkbox" role="switch">`, { label: "Start with Windows" });
  expect(mark(toggle)?.innerHTML).toBe("");
});

test("connecting again doesn't add a second label or error", () => {
  const element = make(`<input>`, { label: "Name", error: "Too long" });
  element.remove();
  document.body.append(element);
  expect(element.querySelectorAll("label")).toHaveLength(1);
  expect(element.querySelectorAll(".gb-field-error")).toHaveLength(1);
});

test("waits for a control that arrives after the field", async () => {
  const element = document.createElement("gb-field") as GbField;
  element.setAttribute("label", "Name");
  document.body.append(element);
  expect(element.querySelector("label")).toBeNull();
  element.append(document.createElement("input"));
  await Promise.resolve();
  expect((find(element, "label") as HTMLLabelElement).htmlFor).toBe(element.control?.id);
});

test("adopts its styles into the document once", () => {
  make(`<input>`, { label: "A" });
  const count = document.adoptedStyleSheets.length;
  make(`<input>`, { label: "B" });
  expect(count).toBeGreaterThan(0);
  expect(document.adoptedStyleSheets).toHaveLength(count);
});
