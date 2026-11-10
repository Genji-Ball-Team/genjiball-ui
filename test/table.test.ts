import { afterEach, expect, test, vi } from "vitest";
import { GbTable } from "../src/table.js";

function make(sticky = false): GbTable {
  const element = document.createElement("gb-table") as GbTable;
  if (sticky) element.setAttribute("sticky", "");
  element.innerHTML = `<table>
    <thead><tr><th data-sort>Player</th><th data-sort data-type="number">Rating</th><th>Note</th></tr></thead>
    <tbody>
      <tr><td>bladewave</td><td>2,512</td><td>a</td></tr>
      <tr><td>Kyoryu</td><td>2,871</td><td>b</td></tr>
      <tr><td>Ryujin</td><td>—</td><td>c</td></tr>
      <tr><td>Ásta</td><td>−40</td><td>d</td></tr>
    </tbody>
  </table>`;
  document.body.append(element);
  return element;
}

const cells = (element: GbTable, index: number) => [
  ...(element.table?.querySelectorAll(`tbody > tr > :nth-child(${index + 1})`) ?? []),
];

const column = (element: GbTable, index: number) =>
  cells(element, index).map((cell) => cell.textContent);

const button = (element: GbTable, index: number) =>
  element.headers[index]?.querySelector("button") ?? null;

afterEach(() => {
  document.body.replaceChildren();
});

test("sortable headers get a button, the others stay text", () => {
  const element = make();
  expect(button(element, 0)?.type).toBe("button");
  expect(button(element, 0)?.textContent).toBe("Player");
  expect(button(element, 1)?.textContent).toBe("Rating");
  expect(button(element, 2)).toBeNull();
  expect(element.headers[2]?.textContent).toBe("Note");
});

test("number columns line up on the right, header and cells", () => {
  const element = make();
  expect(element.headers.map((header) => header.classList.contains("gb-table-num"))).toEqual([
    false,
    true,
    false,
  ]);
  expect(cells(element, 1).every((cell) => cell.classList.contains("gb-table-num"))).toBe(true);
});

test("a number column sorts high to low first, then reverses; rows without a number go last", () => {
  const element = make();
  button(element, 1)?.click();
  expect(column(element, 1)).toEqual(["2,871", "2,512", "−40", "—"]);
  expect(element.headers[1]?.getAttribute("aria-sort")).toBe("descending");
  button(element, 1)?.click();
  expect(column(element, 1)).toEqual(["−40", "2,512", "2,871", "—"]);
  expect(element.headers[1]?.getAttribute("aria-sort")).toBe("ascending");
});

test("a text column sorts A to Z first, ignoring case and accents", () => {
  const element = make();
  button(element, 0)?.click();
  expect(column(element, 0)).toEqual(["Ásta", "bladewave", "Kyoryu", "Ryujin"]);
  expect(element.headers[0]?.getAttribute("aria-sort")).toBe("ascending");
});

test("only the sorted column has aria-sort", () => {
  const element = make();
  button(element, 0)?.click();
  button(element, 1)?.click();
  expect(element.headers.map((header) => header.getAttribute("aria-sort"))).toEqual([
    null,
    "descending",
    null,
  ]);
});

test("a header marked as sorted already flips on the first pick", () => {
  const element = make();
  element.headers[1]?.setAttribute("aria-sort", "descending");
  button(element, 1)?.click();
  expect(element.headers[1]?.getAttribute("aria-sort")).toBe("ascending");
});

test("fires sort first; cancelling it leaves the rows for the app", () => {
  const element = make();
  const listener = vi.fn((event: Event) => {
    event.preventDefault();
  });
  element.addEventListener("sort", listener);
  button(element, 1)?.click();
  const event = listener.mock.calls[0]?.[0] as CustomEvent;
  expect(event.detail).toEqual({ column: 1, direction: "descending" });
  expect(column(element, 0)).toEqual(["bladewave", "Kyoryu", "Ryujin", "Ásta"]);
  expect(element.headers[1]?.getAttribute("aria-sort")).toBe("descending");
});

test("sorts on data-value when a cell has one", () => {
  const element = make();
  const notes = cells(element, 2);
  ["3", "1", "4", "2"].forEach((value, index) => {
    notes[index]?.setAttribute("data-value", value);
  });
  element.headers[2]?.setAttribute("data-type", "number");
  element.sort(2, "ascending");
  expect(column(element, 2)).toEqual(["b", "d", "a", "c"]);
});

test("sort() fires no event", () => {
  const element = make();
  const listener = vi.fn();
  element.addEventListener("sort", listener);
  element.sort(0, "descending");
  expect(listener).not.toHaveBeenCalled();
  expect(column(element, 0)).toEqual(["Ryujin", "Kyoryu", "bladewave", "Ásta"]);
});

test("rows added later get the number column too", async () => {
  const element = make();
  element
    .querySelector("tbody")
    ?.insertAdjacentHTML("beforeend", "<tr><td>New</td><td>1,000</td></tr>");
  await new Promise((resolve) => setTimeout(resolve));
  expect(cells(element, 1).at(-1)?.classList.contains("gb-table-num")).toBe(true);
});

test("sticky is only an attribute, for the styles", () => {
  expect(make(true).hasAttribute("sticky")).toBe(true);
});

/** A table whose columns are 100px each, in a box `width` wide. */
function sized(width: number, priorities: (string | null)[], rowHeader = -1): GbTable {
  const box = { width };
  const element = document.createElement("gb-table") as GbTable;
  const head = priorities
    .map((priority, index) => `<th${priority ? ` data-priority="${priority}"` : ""}>C${index}</th>`)
    .join("");
  const row = priorities
    .map((_, index) =>
      index === rowHeader ? `<th scope="row">r${index}</th>` : `<td>r${index}</td>`,
    )
    .join("");
  element.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody><tr>${row}</tr><tr>${row}</tr></tbody></table>`;
  Object.defineProperty(element, "clientWidth", { get: () => box.width });
  Object.defineProperty(element, "scrollWidth", {
    get: () =>
      Math.max(
        box.width,
        element.headers.filter((h) => !h.classList.contains("gb-table-drop")).length * 100,
      ),
  });
  document.body.append(element);
  element.fit();
  boxes.set(element, box);
  return element;
}

const boxes = new WeakMap<GbTable, { width: number }>();

function resize(element: GbTable, width: number): void {
  const box = boxes.get(element);
  if (box) box.width = width;
  element.fit();
}

const dropped = (element: GbTable) =>
  element.headers.map((header) => header.classList.contains("gb-table-drop"));

test("low-priority columns drop out, rightmost first, only as far as needed", () => {
  const element = sized(400, [null, "low", null, "low", null, "low"]);
  expect(dropped(element)).toEqual([false, false, false, true, false, true]);
  // The cells go with their header.
  expect(cells(element, 5).every((cell) => cell.classList.contains("gb-table-drop"))).toBe(true);
  expect(cells(element, 1).some((cell) => cell.classList.contains("gb-table-drop"))).toBe(false);
});

test("medium columns drop after every low one", () => {
  const element = sized(200, [null, "medium", "low", null, "low"]);
  expect(dropped(element)).toEqual([false, true, true, false, true]);
});

test("nothing drops when the table fits, and dropped columns come back with room", () => {
  const element = sized(600, [null, "low", null]);
  expect(dropped(element)).toEqual([false, false, false]);
  resize(element, 200);
  expect(dropped(element)).toEqual([false, true, false]);
  resize(element, 300);
  expect(dropped(element)).toEqual([false, false, false]);
});

test("unmarked columns never drop; the table scrolls instead", () => {
  expect(dropped(sized(200, [null, null, null]))).toEqual([false, false, false]);
});

test("a table with no width drops nothing", () => {
  expect(dropped(sized(0, [null, "low"]))).toEqual([false, false]);
});

test("the first column is held in place, with the edge on it", () => {
  const element = sized(200, [null, null, null]);
  expect(cells(element, 0).every((cell) => cell.classList.contains("gb-table-pin-end"))).toBe(true);
  expect(cells(element, 1).some((cell) => cell.classList.contains("gb-table-pin"))).toBe(false);
});

test("a row header in the lead columns is held in place with the columns before it", () => {
  const element = sized(200, [null, null, null, null], 1);
  const pinned = (index: number) =>
    [element.headers[index], ...cells(element, index)].every((cell) =>
      cell?.classList.contains("gb-table-pin"),
    );
  expect([0, 1, 2].map(pinned)).toEqual([true, true, false]);
  expect(cells(element, 1).every((cell) => cell.classList.contains("gb-table-pin-end"))).toBe(true);
  expect(cells(element, 0).some((cell) => cell.classList.contains("gb-table-pin-end"))).toBe(false);
});

test("a row header further right only pins the first column", () => {
  const element = sized(200, [null, null, null, null], 3);
  expect(cells(element, 3).some((cell) => cell.classList.contains("gb-table-pin"))).toBe(false);
});

test("the edge shows once the table is scrolled sideways", () => {
  const element = sized(200, [null, null, null]);
  expect(element.classList.contains("gb-table-scrolled")).toBe(false);
  Object.defineProperty(element, "scrollLeft", { get: () => 40 });
  element.dispatchEvent(new Event("scroll"));
  expect(element.classList.contains("gb-table-scrolled")).toBe(true);
});

test("sorting keeps dropped columns dropped", () => {
  const element = sized(200, [null, "low", null]);
  element.sort(0, "descending");
  expect(dropped(element)).toEqual([false, true, false]);
  expect(cells(element, 1).every((cell) => cell.classList.contains("gb-table-drop"))).toBe(true);
});

/** A table from `html` in a box `width` wide, each column 100px while its header shows. */
function shaped(width: number, html: string): GbTable {
  const element = document.createElement("gb-table") as GbTable;
  element.innerHTML = `<table>${html}</table>`;
  Object.defineProperty(element, "clientWidth", { get: () => width });
  Object.defineProperty(element, "scrollWidth", {
    get: () =>
      Math.max(
        width,
        element.headers.filter((h) => !h.classList.contains("gb-table-drop")).length * 100,
      ),
  });
  document.body.append(element);
  element.fit();
  return element;
}

const droppedText = (element: GbTable) =>
  [...(element.table?.querySelectorAll(".gb-table-drop") ?? [])].map((cell) => cell.textContent);

test("a footer's cells drop with their column", () => {
  const element = shaped(
    200,
    `<thead><tr><th>Player</th><th data-priority="low">Saves</th><th>Rating</th></tr></thead>
    <tbody><tr><td>a</td><td>3</td><td>2,000</td></tr></tbody>
    <tfoot><tr><td>Total</td><td>3 saves</td><td>2,000</td></tr></tfoot>`,
  );
  expect(droppedText(element)).toEqual(["Saves", "3", "3 saves"]);
});

test("a multi-row header drops the column's cell in every header row", () => {
  const element = shaped(
    200,
    `<thead>
      <tr><th>Who</th><th>Extra</th><th>Main</th></tr>
      <tr><th>Player</th><th data-priority="low">Saves</th><th>Rating</th></tr>
    </thead>
    <tbody><tr><td>a</td><td>3</td><td>2,000</td></tr></tbody>`,
  );
  expect(droppedText(element)).toEqual(["Extra", "Saves", "3"]);
});

test("a header coming down from the row above (rowspan) still lines its column up", () => {
  const element = shaped(
    200,
    `<thead>
      <tr><th rowspan="2">Player</th><th>Saves</th><th>Rating</th></tr>
      <tr><th data-priority="low">Total</th><th>Now</th></tr>
    </thead>
    <tbody><tr><td>a</td><td>3</td><td>2,000</td></tr></tbody>`,
  );
  expect(element.headers.map((h) => h.textContent)).toEqual(["Player", "Total", "Now"]);
  expect(droppedText(element)).toEqual(["Saves", "Total", "3"]);
});

test("a column under a cell spanning several never drops", () => {
  const element = shaped(
    100,
    `<thead><tr><th>Player</th><th data-priority="low">Goals</th><th data-priority="low">Saves</th><th data-priority="low">Note</th></tr></thead>
    <tbody><tr><td>a</td><td>1</td><td>3</td><td>x</td></tr></tbody>
    <tfoot><tr><td>Total</td><td colspan="2">4</td><td>x</td></tr></tfoot>`,
  );
  // Note drops; Goals and Saves share the footer's 4, so they stay and the table scrolls.
  expect(droppedText(element)).toEqual(["Note", "x", "x"]);
});

test("rows that don't line up drop nothing: the table scrolls with its pinned column", () => {
  const element = shaped(
    100,
    `<thead><tr><th>Player</th><th data-priority="low">Saves</th><th>Rating</th></tr></thead>
    <tbody><tr><td>a</td><td>3</td><td>2,000</td></tr><tr><td colspan="2">b</td><td>1</td><td>extra</td></tr></tbody>`,
  );
  expect(droppedText(element)).toEqual([]);
  expect(element.headers[0]?.classList.contains("gb-table-pin-end")).toBe(true);
});

test("cells after a rowspan line up by their real column", () => {
  const element = shaped(
    600,
    `<thead><tr><th>Group</th><th>Player</th><th data-type="number">Rating</th></tr></thead>
    <tbody><tr><td rowspan="2">A</td><td>x</td><td>1</td></tr><tr><td>y</td><td>2</td></tr></tbody>`,
  );
  const second = element.table?.querySelectorAll("tbody > tr")[1];
  expect(second?.lastElementChild?.classList.contains("gb-table-num")).toBe(true);
  expect(second?.firstElementChild?.classList.contains("gb-table-num")).toBe(false);
});
