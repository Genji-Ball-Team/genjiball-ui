import { afterEach, expect, test, vi } from "vitest";
import { GbSearch } from "../src/search.js";
import type { SearchItem, SearchQuery } from "../src/search.js";

const players: SearchItem[] = [
  { name: "Kyoryu", tier: "master", detail: "1840", href: "/player?id=1" },
  { name: "Ryuji", detail: "1610" },
  { name: "Hanzo Main", note: "was Ryu", detail: "1500" },
];

function make(attributes: Record<string, string> = {}): GbSearch {
  const element = document.createElement("gb-search") as GbSearch;
  element.setAttribute("label", "Find a player");
  element.setAttribute("delay", "0");
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  document.body.append(element);
  return element;
}

const detailOf = (event: Event) => (event as CustomEvent<SearchQuery>).detail;

function type(element: GbSearch, text: string): void {
  element.input.focus();
  element.input.value = text;
  element.input.dispatchEvent(new Event("input", { bubbles: true }));
}

function press(element: GbSearch, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  element.input.dispatchEvent(event);
  return event;
}

/** Types `text` and answers it at once with `items`. */
function typeAnswered(element: GbSearch, text: string, items = players): void {
  element.addEventListener(
    "query",
    (event) => {
      detailOf(event).answer(items);
    },
    { once: true },
  );
  type(element, text);
}

const rows = (element: GbSearch) => [...element.querySelectorAll("[role=option]")];
const text = (node: Element | null | undefined) => node?.textContent.trim();

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

test("labels the input and makes it a combobox over a listbox", () => {
  const element = make({ placeholder: "Find a player", name: "q" });
  const { input } = element;
  expect(element.querySelector("label")?.htmlFor).toBe(input.id);
  expect(text(element.querySelector("label"))).toBe("Find a player");
  expect(input.getAttribute("role")).toBe("combobox");
  expect(input.getAttribute("aria-autocomplete")).toBe("list");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(input.name).toBe("q");
  expect(input.placeholder).toBe("Find a player");
  const list = document.getElementById(input.getAttribute("aria-controls") ?? "");
  expect(list?.getAttribute("role")).toBe("listbox");
  expect(element.querySelector("svg")).not.toBeNull();
});

test("typing fires query with the trimmed text and shows the answer", () => {
  const element = make();
  const queries: string[] = [];
  element.addEventListener("query", (event) => {
    const { query, answer } = detailOf(event);
    queries.push(query);
    expect(element.loading).toBe(true);
    answer(players);
  });
  type(element, "  ryu ");
  expect(queries).toEqual(["ryu"]);
  expect(element.loading).toBe(false);
  expect(element.open).toBe(true);
  expect(element.input.getAttribute("aria-expanded")).toBe("true");
  expect(rows(element)).toHaveLength(3);
});

test("rows show the name with the match in bold, the tier chip, the note and the detail", () => {
  const element = make();
  typeAnswered(element, "ryu");
  const [first, second, third] = rows(element);
  expect(first?.querySelector("b")?.textContent).toBe("ryu");
  expect(text(first?.querySelector(".gb-search-name"))).toBe("Kyoryu");
  expect(first?.querySelector("gb-chip")?.getAttribute("tier")).toBe("master");
  expect(text(first?.querySelector("gb-chip"))).toBe("Master");
  expect(text(first?.querySelector(".gb-search-detail"))).toBe("1840");
  expect(first?.tagName).toBe("A");
  expect(first?.getAttribute("href")).toBe("/player?id=1");
  expect(second?.tagName).toBe("DIV");
  expect(second?.querySelector("b")?.textContent).toBe("Ryu");
  expect(third?.querySelector("b")).toBeNull();
  expect(text(third?.querySelector("small"))).toBe("was Ryu");
});

test("shows at most 8 suggestions", () => {
  const element = make();
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `p${i}` }));
  typeAnswered(element, "p", many);
  expect(rows(element)).toHaveLength(8);
});

test("arrow keys move through the list round the end and set aria-activedescendant", () => {
  const element = make();
  typeAnswered(element, "ryu");
  const { input } = element;
  const active = () =>
    rows(element).findIndex((row) => row.id === input.getAttribute("aria-activedescendant"));
  expect(active()).toBe(-1);
  expect(press(element, "ArrowDown").defaultPrevented).toBe(true);
  expect(active()).toBe(0);
  expect(rows(element)[0]?.getAttribute("aria-selected")).toBe("true");
  press(element, "ArrowDown");
  expect(active()).toBe(1);
  press(element, "ArrowDown");
  press(element, "ArrowDown");
  expect(active()).toBe(0);
  press(element, "ArrowUp");
  expect(active()).toBe(2);
  expect(rows(element)[0]?.getAttribute("aria-selected")).toBe("false");
});

test("Home and End go to the first and last item once one is active, else move the cursor", () => {
  const element = make();
  typeAnswered(element, "ryu");
  expect(press(element, "End").defaultPrevented).toBe(false);
  expect(element.input.hasAttribute("aria-activedescendant")).toBe(false);
  press(element, "ArrowDown");
  expect(press(element, "End").defaultPrevented).toBe(true);
  expect(element.input.getAttribute("aria-activedescendant")).toBe(rows(element)[2]?.id);
  press(element, "Home");
  expect(element.input.getAttribute("aria-activedescendant")).toBe(rows(element)[0]?.id);
});

test("Enter chooses the active item with pick; without one it does nothing", () => {
  const element = make();
  typeAnswered(element, "ryu");
  const picked: string[] = [];
  element.addEventListener("pick", (event) => {
    picked.push((event as CustomEvent<SearchItem>).detail.name);
    event.preventDefault();
  });
  expect(press(element, "Enter").defaultPrevented).toBe(false);
  press(element, "ArrowDown");
  press(element, "ArrowDown");
  expect(press(element, "Enter").defaultPrevented).toBe(true);
  expect(picked).toEqual(["Ryuji"]);
  expect(element.open).toBe(false);
});

test("clicking an item fires pick, and an app can cancel the link", () => {
  const element = make();
  typeAnswered(element, "ryu");
  const picked = vi.fn((event: Event) => {
    event.preventDefault();
  });
  element.addEventListener("pick", picked);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  rows(element)[0]?.dispatchEvent(click);
  expect(picked).toHaveBeenCalledOnce();
  expect(click.defaultPrevented).toBe(true);
});

test("Escape closes the list, then clears the box, then is left to the page", () => {
  const element = make();
  typeAnswered(element, "ryu");
  const inputs = vi.fn();
  element.addEventListener("input", inputs);
  expect(press(element, "Escape").defaultPrevented).toBe(true);
  expect(element.open).toBe(false);
  expect(element.input.value).toBe("ryu");
  expect(press(element, "Escape").defaultPrevented).toBe(true);
  expect(element.input.value).toBe("");
  expect(inputs).toHaveBeenCalledOnce();
  expect(press(element, "Escape").defaultPrevented).toBe(false);
});

test("typing again opens the list after Escape closed it", () => {
  const element = make();
  typeAnswered(element, "ryu");
  press(element, "Escape");
  typeAnswered(element, "ryuj");
  expect(element.open).toBe(true);
});

test("an answer to an old query is dropped", () => {
  const element = make();
  const asked: SearchQuery[] = [];
  element.addEventListener("query", (event) => asked.push(detailOf(event)));
  type(element, "r");
  type(element, "ry");
  const [old, current] = asked;
  expect(old?.signal.aborted).toBe(true);
  expect(current?.signal.aborted).toBe(false);
  current?.answer([{ name: "Ryuji" }]);
  old?.answer([{ name: "Rando" }]);
  old?.fail();
  expect(rows(element).map(text)).toEqual(["Ryuji"]);
  expect(element.error).toBe("");
});

test("clearing the box drops the query still on its way", () => {
  const element = make();
  let asked: SearchQuery | undefined;
  element.addEventListener("query", (event) => (asked = detailOf(event)));
  type(element, "ryu");
  type(element, "");
  asked?.answer(players);
  expect(asked?.signal.aborted).toBe(true);
  expect(rows(element)).toHaveLength(0);
  expect(element.open).toBe(false);
  expect(element.loading).toBe(false);
});

test("waits `delay` ms after typing before asking", () => {
  vi.useFakeTimers();
  const element = make({ delay: "300" });
  const asked = vi.fn();
  element.addEventListener("query", asked);
  type(element, "r");
  type(element, "ry");
  vi.advanceTimersByTime(299);
  expect(asked).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(asked).toHaveBeenCalledOnce();
});

test("min-length holds back short queries", () => {
  const element = make({ "min-length": "2" });
  const asked = vi.fn();
  element.addEventListener("query", asked);
  type(element, "r");
  expect(asked).not.toHaveBeenCalled();
  type(element, "ry");
  expect(asked).toHaveBeenCalledOnce();
});

test("says so when no one matches, with the query in quotes", () => {
  const element = make();
  typeAnswered(element, "zzz", []);
  expect(element.open).toBe(true);
  expect(text(element.querySelector(".gb-search-note"))).toBe("No one called “zzz”.");
  expect(element.input.hasAttribute("aria-activedescendant")).toBe(false);
  element.setAttribute("empty", "No one in EU is called");
  expect(text(element.querySelector(".gb-search-note"))).toBe("No one in EU is called “zzz”.");
});

test("an error shows as a line in orange until the next query", () => {
  const element = make();
  element.addEventListener(
    "query",
    (event) => {
      detailOf(event).fail();
    },
    { once: true },
  );
  type(element, "ryu");
  const note = element.querySelector(".gb-search-note");
  expect(text(note)).toBe("⚠ The search didn't load. Try again.");
  expect(note?.hasAttribute("data-error")).toBe(true);
  expect(element.open).toBe(true);
  type(element, "ryun");
  expect(element.error).toBe("");
});

test("while loading with no results the list says Searching", () => {
  const element = make();
  type(element, "ryu");
  expect(element.loading).toBe(true);
  expect(element.input.getAttribute("aria-busy")).toBe("true");
  expect(text(element.querySelector(".gb-search-note"))).toBe("Searching…");
});

test("results can be set from code for the current text", () => {
  const element = make();
  type(element, "ryu");
  element.results = players;
  expect(rows(element)).toHaveLength(3);
  expect(element.loading).toBe(false);
});

test("filter mode has no list or combobox and only fires input", () => {
  const element = make({ filter: "" });
  const asked = vi.fn();
  const inputs = vi.fn();
  element.addEventListener("query", asked);
  element.addEventListener("input", inputs);
  type(element, "ryu");
  expect(inputs).toHaveBeenCalledOnce();
  expect(asked).not.toHaveBeenCalled();
  expect(element.open).toBe(false);
  expect(element.input.hasAttribute("role")).toBe(false);
  expect(element.input.hasAttribute("aria-expanded")).toBe(false);
  expect(press(element, "ArrowDown").defaultPrevented).toBe(false);
  expect(press(element, "Escape").defaultPrevented).toBe(true);
  expect(element.input.value).toBe("");
});

test("blur closes the list; focus brings it back", () => {
  const element = make();
  typeAnswered(element, "ryu");
  element.input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  expect(element.open).toBe(false);
  element.input.dispatchEvent(new FocusEvent("focus"));
  expect(element.open).toBe(true);
});

test("the shortcut key focuses the box, shows a hint and ignores text fields", () => {
  const element = make({ shortcut: "/" });
  expect(text(element.querySelector("kbd"))).toBe("/");
  expect(element.querySelector("kbd")?.getAttribute("aria-hidden")).toBe("true");
  const other = document.createElement("input");
  document.body.append(other);
  other.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
  expect(document.activeElement).not.toBe(element.input);
  const event = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
  document.body.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(element.input);
  type(element, "a");
  expect(element.hasAttribute("data-filled")).toBe(true);
});

test("the shortcut stops listening when the box leaves the page", () => {
  const element = make({ shortcut: "/" });
  element.remove();
  const event = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
  document.body.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});

test("disabled disables the input and the list never opens", () => {
  const element = make({ disabled: "" });
  expect(element.input.disabled).toBe(true);
  element.input.value = "ryu";
  element.results = players;
  expect(element.open).toBe(false);
});

test("connecting again doesn't add a second input", () => {
  const element = make();
  element.remove();
  document.body.append(element);
  expect(element.querySelectorAll("input")).toHaveLength(1);
  expect(element.querySelectorAll("label")).toHaveLength(1);
});

test("a box filled before it's focused asks for its suggestions on focus, once", () => {
  const element = make({ value: "ryu" });
  const queries: string[] = [];
  element.addEventListener("query", (event) => {
    queries.push(detailOf(event).query);
    detailOf(event).answer(players);
  });
  expect(element.open).toBe(false);
  element.input.focus();
  expect(queries).toEqual(["ryu"]);
  expect(element.open).toBe(true);
  element.input.blur();
  element.input.focus();
  expect(queries).toEqual(["ryu"]);
});
