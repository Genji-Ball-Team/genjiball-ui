import { expect, test } from "vitest";
import { defineElement } from "../src/define.js";

test("defineElement registers a name once and skips repeats", () => {
  class First extends HTMLElement {}
  class Second extends HTMLElement {}
  defineElement("gb-define-test", First);
  defineElement("gb-define-test", Second);
  expect(customElements.get("gb-define-test")).toBe(First);
});
