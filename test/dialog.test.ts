import { afterEach, expect, test, vi } from "vitest";
import { confirmDialog, GbDialog } from "../src/dialog.js";

function make(): GbDialog {
  const element = document.createElement("gb-dialog") as GbDialog;
  element.setAttribute("label", "Delete this match?");
  element.innerHTML = `<p>Its rating changes are undone.</p>
    <gb-button slot="actions" value="cancel">Cancel</gb-button>
    <gb-button slot="actions" variant="danger" value="delete">Delete match</gb-button>`;
  document.body.append(element);
  return element;
}

const inner = (element: GbDialog) =>
  element.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
const actions = (element: GbDialog) => [
  ...element.querySelectorAll<HTMLElement>('[slot="actions"]'),
];

afterEach(() => {
  document.body.replaceChildren();
});

test("is named by its heading", () => {
  const element = make();
  const heading = element.shadowRoot?.querySelector("h2");
  expect(heading?.textContent).toBe("Delete this match?");
  expect(inner(element).getAttribute("aria-labelledby")).toBe(heading?.id);
});

test("opens as a modal with focus on Cancel", () => {
  const element = make();
  element.show();
  expect(element.open).toBe(true);
  expect(document.activeElement).toBe(actions(element)[0]);
});

test("focus starts on an autofocus element when there is one", () => {
  const element = make();
  const input = document.createElement("input");
  input.autofocus = true;
  element.prepend(input);
  element.show();
  expect(document.activeElement).toBe(input);
});

test("a button with a value closes it with that value, fires close and returns focus", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const element = make();
  const closed = vi.fn();
  element.addEventListener("close", closed);
  element.show();
  actions(element)[1]?.click();
  expect(element.open).toBe(false);
  expect(element.returnValue).toBe("delete");
  expect(closed).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(opener);
});

test("Escape cancels", () => {
  const element = make();
  element.show();
  inner(element).dispatchEvent(new Event("cancel", { cancelable: true }));
  expect(element.open).toBe(false);
  expect(element.returnValue).toBe("cancel");
});

test("a click on the dimmed page cancels, a click in the box doesn't", () => {
  const element = make();
  element.show();
  const box = element.shadowRoot?.querySelector(".box");
  box?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  box?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(element.open).toBe(true);
  inner(element).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  inner(element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(element.open).toBe(false);
  expect(element.returnValue).toBe("cancel");
});

test("a drag from the box out to the dimmed page doesn't cancel", () => {
  const element = make();
  element.show();
  element.shadowRoot
    ?.querySelector(".box")
    ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  inner(element).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(element.open).toBe(true);
});

test("confirmDialog resolves true for the action and leaves the page", async () => {
  const answer = confirmDialog({
    title: "Delete this match?",
    text: "Its rating changes are undone.",
    action: "Delete match",
    danger: true,
  });
  const dialog = document.querySelector("gb-dialog") as GbDialog;
  expect(dialog.label).toBe("Delete this match?");
  expect(dialog.querySelector("p")?.textContent).toBe("Its rating changes are undone.");
  const [cancel, action] = actions(dialog);
  expect(cancel?.textContent).toBe("Cancel");
  expect(action?.getAttribute("variant")).toBe("danger");
  expect(document.activeElement).toBe(cancel);
  action?.click();
  await expect(answer).resolves.toBe(true);
  expect(document.querySelector("gb-dialog")).toBeNull();
});

test("confirmDialog resolves false on cancel, with a primary action when not dangerous", async () => {
  const answer = confirmDialog({ title: "Leave the lobby?", action: "Leave" });
  const dialog = document.querySelector("gb-dialog") as GbDialog;
  expect(actions(dialog)[1]?.getAttribute("variant")).toBe("primary");
  expect(dialog.querySelector("p")).toBeNull();
  actions(dialog)[0]?.click();
  await expect(answer).resolves.toBe(false);
});
