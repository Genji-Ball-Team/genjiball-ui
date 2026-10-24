import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { type CountDetail, GbCount } from "../src/count.js";

let reduced = false;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  reduced = false;
  frames = [];
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) => ({ matches: reduced && query.includes("reduce") }) as MediaQueryList,
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function make(value?: string): GbCount {
  const element = document.createElement("gb-count") as GbCount;
  if (value !== undefined) element.setAttribute("value", value);
  document.body.append(element);
  return element;
}

// Runs the queued frames at `time` milliseconds.
function frameAt(time: number): void {
  const queued = frames;
  frames = [];
  for (const callback of queued) callback(time);
}

const shown = (element: GbCount) => element.shadowRoot?.querySelector("[part=value]")?.textContent;
const spoken = (element: GbCount) => element.shadowRoot?.querySelector(".gb-sr")?.textContent;

test("the first value shows straight away, formatted", () => {
  const element = make("1842");
  expect(shown(element)).toBe("1,842");
  expect(spoken(element)).toBe("1,842");
  expect(frames).toHaveLength(0);
});

test("a value set after it's shown with none still shows straight away", () => {
  const element = make();
  expect(shown(element)).toBe("");
  element.value = 1842;
  expect(shown(element)).toBe("1,842");
  expect(frames).toHaveLength(0);
});

test("a change counts to the new value over 0.6s, eased out", () => {
  const element = make("1818");
  element.value = 1842;
  expect(spoken(element)).toBe("1,842");
  frameAt(0);
  expect(shown(element)).toBe("1,818");
  frameAt(300);
  // Halfway through the time, an ease-out is well past halfway: 1818 + 24 × 0.875.
  expect(shown(element)).toBe("1,839");
  frameAt(600);
  expect(shown(element)).toBe("1,842");
  expect(frames).toHaveLength(0);
});

test("counts down too", () => {
  const element = make("1842");
  element.value = 1831;
  frameAt(0);
  frameAt(600);
  expect(shown(element)).toBe("1,831");
});

test("a change during a count carries on from the number shown", () => {
  const element = make("1000");
  element.value = 2000;
  frameAt(0);
  frameAt(300);
  expect(shown(element)).toBe("1,875");
  element.value = 1900;
  frameAt(1000);
  expect(shown(element)).toBe("1,875");
  frameAt(1600);
  expect(shown(element)).toBe("1,900");
});

test("fires a bubbling count event when it starts", () => {
  const element = make("1818");
  const events: CountDetail[] = [];
  document.body.addEventListener("count", (event) => {
    events.push((event as CustomEvent<CountDetail>).detail);
  });
  element.value = 1842;
  expect(events).toEqual([{ from: 1818, to: 1842 }]);
});

test("under reduced motion the new value shows at once, with no event", () => {
  reduced = true;
  const element = make("1818");
  const listener = vi.fn();
  element.addEventListener("count", listener);
  element.value = 1842;
  expect(shown(element)).toBe("1,842");
  expect(frames).toHaveLength(0);
  expect(listener).not.toHaveBeenCalled();
});

test("a page in the background shows the new value at once", () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  const element = make("1818");
  element.value = 1842;
  expect(shown(element)).toBe("1,842");
  expect(frames).toHaveLength(0);
});

test("the same whole number doesn't count", () => {
  const element = make("1842");
  element.value = 1842.2;
  expect(frames).toHaveLength(0);
});

test("anything that isn't a number shows nothing", () => {
  const element = make("1842");
  element.setAttribute("value", "abc");
  expect(element.value).toBeUndefined();
  expect(shown(element)).toBe("");
  expect(frames).toHaveLength(0);
});

test("the numbers in between are hidden from screen readers", () => {
  const element = make("1842");
  expect(element.shadowRoot?.querySelector("[part=value]")?.getAttribute("aria-hidden")).toBe(
    "true",
  );
});
