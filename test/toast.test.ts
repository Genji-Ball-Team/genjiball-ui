import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GbToast, type GbToastRegion, successMs, toast } from "../src/toast.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const region = () => document.querySelector<GbToastRegion>("gb-toast-region");
const said = (role: "status" | "alert") =>
  region()?.shadowRoot?.querySelector(`[role="${role}"]`)?.textContent ?? "";

test("puts the toast in one region, added to the page on first use", () => {
  const first = toast("Match uploaded");
  const second = toast("Match uploaded");
  expect(document.querySelectorAll("gb-toast-region")).toHaveLength(1);
  expect(first.parentElement).toBe(region());
  expect(second.previousElementSibling).toBe(first);
});

test("uses a region already in the page", () => {
  const own = document.createElement("gb-toast-region");
  document.body.append(own);
  expect(toast("Match uploaded").parentElement).toBe(own);
});

test("a success closes itself after ~4s and fires close", () => {
  const element = toast("Match uploaded");
  const closed = vi.fn();
  element.addEventListener("close", closed);
  vi.advanceTimersByTime(successMs - 1);
  expect(element.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(element.isConnected).toBe(false);
  expect(closed).toHaveBeenCalledOnce();
});

test("a success waits while the pointer or focus is on it, then starts over", () => {
  const element = toast("Match uploaded");
  element.dispatchEvent(new Event("pointerenter"));
  vi.advanceTimersByTime(successMs * 2);
  expect(element.isConnected).toBe(true);
  element.dispatchEvent(new FocusEvent("focusin"));
  element.dispatchEvent(new Event("pointerleave"));
  vi.advanceTimersByTime(successMs * 2);
  expect(element.isConnected).toBe(true);
  element.dispatchEvent(new FocusEvent("focusout"));
  vi.advanceTimersByTime(successMs - 1);
  expect(element.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(element.isConnected).toBe(false);
});

test("an error stays until closed", () => {
  const element = toast("Upload failed. Your log is kept.", { kind: "error" });
  vi.advanceTimersByTime(successMs * 10);
  expect(element.isConnected).toBe(true);
  element.shadowRoot?.querySelector<HTMLButtonElement>(".close")?.click();
  expect(element.isConnected).toBe(false);
});

test("Escape closes it", () => {
  const element = toast("Upload failed.", { kind: "error" });
  element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(element.isConnected).toBe(false);
});

test("the close button has a name", () => {
  const close = toast("Match uploaded").shadowRoot?.querySelector(".close");
  expect(close?.getAttribute("aria-label")).toBe("Close");
});

test("the action runs, then closes the toast", () => {
  const run = vi.fn();
  const element = toast("Upload failed.", { kind: "error", action: { label: "Retry", run } });
  const button = element.querySelector<HTMLElement>('gb-button[slot="action"]');
  expect(button?.textContent).toBe("Retry");
  button?.click();
  expect(run).toHaveBeenCalledOnce();
  expect(element.isConnected).toBe(false);
});

test("message is the text without the action", () => {
  const element = toast("Upload  failed.", { kind: "error", action: { label: "Retry", run() {} } });
  expect(element.message).toBe("Upload failed.");
});

test("kind reads back only known values", () => {
  const element = document.createElement("gb-toast") as GbToast;
  expect(element.kind).toBe("success");
  element.setAttribute("kind", "warning");
  expect(element.kind).toBe("success");
  element.kind = "error";
  expect(element.kind).toBe("error");
  expect(element).toBeInstanceOf(GbToast);
});

test("draws a tick for success and a warning sign for errors, hidden from screen readers", () => {
  const icon = (element: GbToast) => element.shadowRoot?.querySelector(".icon");
  const success = toast("Match uploaded");
  const error = toast("Upload failed.", { kind: "error" });
  expect(icon(success)?.getAttribute("aria-hidden")).toBe("true");
  expect(icon(success)?.innerHTML).not.toBe(icon(error)?.innerHTML);
});

test("screen readers hear successes politely and errors straight away, once the region is in", async () => {
  toast("Match uploaded");
  toast("Upload failed.", { kind: "error", action: { label: "Retry", run() {} } });
  await vi.advanceTimersByTimeAsync(0);
  expect(said("status")).toBe("");
  await vi.advanceTimersByTimeAsync(100);
  expect(said("status")).toBe("Match uploaded");
  expect(said("alert")).toBe("Upload failed.");
});

test("a closed toast's line goes from the live region", async () => {
  const element = toast("Upload failed.", { kind: "error" });
  await vi.advanceTimersByTimeAsync(100);
  element.close();
  await vi.advanceTimersByTimeAsync(0);
  expect(said("alert")).toBe("");
});

test("focus in a closing toast goes back where it came from", () => {
  const before = document.createElement("button");
  document.body.append(before);
  before.focus();
  const element = toast("Upload failed.", { kind: "error", action: { label: "Retry", run() {} } });
  const action = element.querySelector<HTMLElement>("gb-button");
  element.dispatchEvent(new FocusEvent("focusin", { relatedTarget: before }));
  action?.focus();
  element.close();
  expect(document.activeElement).toBe(before);
});

test("colours come from tokens", () => {
  const element = toast("Match uploaded");
  const styles = [element, region()].map(
    (el) => el?.shadowRoot?.querySelector("style")?.textContent,
  );
  for (const css of styles) expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
});
