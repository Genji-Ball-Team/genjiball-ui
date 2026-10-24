import { afterEach, expect, test, vi } from "vitest";
import { GbButton } from "../src/button.js";

function make(
  attributes: Record<string, string> = {},
  parent: HTMLElement = document.body,
): GbButton {
  const element = document.createElement("gb-button") as GbButton;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.textContent = "Save";
  parent.append(element);
  return element;
}

function shadow(element: GbButton, selector: string): Element {
  const found = element.shadowRoot?.querySelector(selector);
  if (!found) throw new Error(`no ${selector} in the shadow root`);
  return found;
}

const inner = (element: GbButton) => shadow(element, "button") as HTMLButtonElement;

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

test("is a native button inside, labelled by its text", () => {
  const element = make();
  expect(inner(element).type).toBe("button");
  expect(shadow(element, "slot")).toBeDefined();
});

test("secondary unless a known variant is set", () => {
  expect(make().variant).toBe("secondary");
  expect(make({ variant: "danger" }).variant).toBe("danger");
  expect(make({ variant: "gold" }).variant).toBe("secondary");
});

test("disabled reaches the inner button and stops clicks", () => {
  const element = make({ disabled: "" });
  const onClick = vi.fn();
  element.addEventListener("click", onClick);
  expect(inner(element).disabled).toBe(true);
  element.click();
  expect(onClick).not.toHaveBeenCalled();
  element.disabled = false;
  expect(inner(element).disabled).toBe(false);
  element.click();
  expect(onClick).toHaveBeenCalledOnce();
});

test("busy stays focusable but ignores clicks", () => {
  const element = make();
  const onClick = vi.fn();
  element.addEventListener("click", onClick);
  element.busy = true;
  expect(inner(element).disabled).toBe(false);
  expect(inner(element).getAttribute("aria-disabled")).toBe("true");
  expect(inner(element).getAttribute("aria-busy")).toBe("true");
  element.click();
  expect(onClick).not.toHaveBeenCalled();
  element.busy = false;
  expect(inner(element).hasAttribute("aria-disabled")).toBe(false);
  element.click();
  expect(onClick).toHaveBeenCalledOnce();
});

test("type=submit submits the form it sits in, type=reset resets it", () => {
  const form = document.createElement("form");
  document.body.append(form);
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  const onReset = vi.fn();
  form.addEventListener("submit", onSubmit);
  form.addEventListener("reset", onReset);
  make({}, form).click();
  expect(onSubmit).not.toHaveBeenCalled();
  make({ type: "submit" }, form).click();
  expect(onSubmit).toHaveBeenCalledOnce();
  make({ type: "reset" }, form).click();
  expect(onReset).toHaveBeenCalledOnce();
});

test("a busy submit button doesn't submit twice", () => {
  const form = document.createElement("form");
  document.body.append(form);
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  form.addEventListener("submit", onSubmit);
  const element = make({ type: "submit", busy: "" }, form);
  element.click();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("flash shows a message in a live region, then clears it", () => {
  vi.useFakeTimers();
  const element = make();
  const feedback = shadow(element, ".feedback");
  const status = shadow(element, "[role=status]");
  expect(inner(element).contains(status)).toBe(false);
  expect(feedback.getAttribute("aria-hidden")).toBe("true");
  element.flash("Copied ✓");
  expect(feedback.textContent).toBe("Copied ✓");
  expect(status.textContent).toBe("Copied ✓");
  expect(inner(element).classList.contains("flashing")).toBe(true);
  vi.advanceTimersByTime(2000);
  expect(feedback.textContent).toBe("");
  expect(status.textContent).toBe("");
  expect(inner(element).classList.contains("flashing")).toBe(false);
});

test("a second flash restarts the timer", () => {
  vi.useFakeTimers();
  const element = make();
  element.flash("Copied ✓");
  vi.advanceTimersByTime(1500);
  element.flash("Copied ✓");
  vi.advanceTimersByTime(1500);
  expect(inner(element).classList.contains("flashing")).toBe(true);
  vi.advanceTimersByTime(500);
  expect(inner(element).classList.contains("flashing")).toBe(false);
});

test("removing the button cancels a flash", () => {
  vi.useFakeTimers();
  const element = make();
  element.flash("Copied ✓");
  element.remove();
  expect(inner(element).classList.contains("flashing")).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

function pressEnter(target: HTMLElement, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function formWithField(): {
  form: HTMLFormElement;
  input: HTMLInputElement;
  onSubmit: ReturnType<typeof vi.fn>;
} {
  const form = document.createElement("form");
  const input = document.createElement("input");
  form.append(input);
  document.body.append(form);
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  form.addEventListener("submit", onSubmit);
  return { form, input, onSubmit };
}

test("Enter in a text field submits through the form's submit button", () => {
  const { form, input, onSubmit } = formWithField();
  make({ type: "submit" }, form);
  make({ type: "submit" }, form);
  expect(pressEnter(input).defaultPrevented).toBe(true);
  expect(onSubmit).toHaveBeenCalledOnce();
});

test("Enter doesn't submit through a busy or disabled button, or without a submit button", () => {
  const { form, input, onSubmit } = formWithField();
  const button = make({}, form);
  pressEnter(input);
  button.setAttribute("type", "submit");
  button.busy = true;
  expect(pressEnter(input).defaultPrevented).toBe(true);
  button.busy = false;
  button.disabled = true;
  pressEnter(input);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("Enter is left alone in a textarea, a checkbox, with a modifier, or with a native submit button", () => {
  const { form, input, onSubmit } = formWithField();
  make({ type: "submit" }, form);
  const textarea = document.createElement("textarea");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  form.append(textarea, checkbox);
  pressEnter(textarea);
  pressEnter(checkbox);
  pressEnter(input, { shiftKey: true });
  const native = document.createElement("button");
  form.append(native);
  expect(pressEnter(input).defaultPrevented).toBe(false);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("a removed button stops listening to its form", () => {
  const { form, input, onSubmit } = formWithField();
  make({ type: "submit" }, form).remove();
  pressEnter(input);
  expect(onSubmit).not.toHaveBeenCalled();
});
