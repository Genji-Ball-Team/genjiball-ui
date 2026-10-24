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
