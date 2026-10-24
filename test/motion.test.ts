import { afterEach, expect, test, vi } from "vitest";
import { durationMs, motionAllowed } from "../src/motion.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("duration tokens in seconds or milliseconds", () => {
  expect(durationMs("0.6s")).toBe(600);
  expect(durationMs("150ms")).toBe(150);
});

test("motion is off under reduced motion and on a page in the background", () => {
  const media = vi
    .spyOn(window, "matchMedia")
    .mockReturnValue({ matches: false } as MediaQueryList);
  expect(motionAllowed()).toBe(true);
  media.mockReturnValue({ matches: true } as MediaQueryList);
  expect(motionAllowed()).toBe(false);
  media.mockReturnValue({ matches: false } as MediaQueryList);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  expect(motionAllowed()).toBe(false);
});
