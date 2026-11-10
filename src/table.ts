import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";

export type SortDirection = "ascending" | "descending";

/** The `sort` event's detail: the column's index and the direction it's now sorted in. */
export interface SortDetail {
  readonly column: number;
  readonly direction: SortDirection;
}

const chevron =
  '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// The table's width never pushes the page wider (`contain`): a table too wide for its box scrolls
// inside it. Every cell has its row's fill, so the pinned columns can stay in place while the rest
// scroll under them, behind a 1px edge once scrolled. `--gb-table-bg` is the surface the table sits
// on: a panel unless the app says so.
const styles = `gb-table { --gb-table-bg: var(--panel); display: block; overflow-x: auto; contain: inline-size; }
gb-table[hidden] { display: none; }
gb-table[sticky] { max-block-size: var(--gb-table-height, 70vh); overflow: auto; }
gb-table > table {
  inline-size: 100%; border-collapse: separate; border-spacing: 0;
  font-size: var(--compact-size); font-variant-numeric: tabular-nums; line-height: 1.3;
}
gb-table > table > caption {
  padding-block-end: 8px; color: var(--muted); text-align: start; text-transform: uppercase;
  font-size: var(--label-size); font-weight: var(--label-weight); font-stretch: var(--label-width); letter-spacing: var(--label-tracking);
}
gb-table :is(th, td) {
  block-size: 36px; padding: 0 10px; background: var(--gb-table-bg); text-align: start; white-space: nowrap;
}
gb-table th {
  block-size: 32px; border-block-end: 1px solid var(--line); color: var(--muted); vertical-align: bottom; padding-block-end: 6px;
  font-size: var(--label-size); font-weight: var(--label-weight); font-stretch: var(--label-width);
  letter-spacing: var(--label-tracking); text-transform: uppercase;
}
gb-table tbody th { border: 0; padding-block-end: 0; vertical-align: middle; color: var(--fg); font-size: inherit; font-stretch: normal; letter-spacing: normal; text-transform: none; }
gb-table tbody > tr:nth-child(even) > * { background: var(--raised); }
gb-table tbody > tr:nth-child(even) > :first-child { border-start-start-radius: var(--r); border-end-start-radius: var(--r); }
gb-table tbody > tr:nth-child(even) > :last-child { border-start-end-radius: var(--r); border-end-end-radius: var(--r); }
gb-table tr > :is(:first-child, .gb-table-pin) { position: sticky; inset-inline-start: 0; z-index: 1; }
gb-table[sticky] thead th { position: sticky; inset-block-start: 0; z-index: 2; }
gb-table[sticky] thead th:is(:first-child, .gb-table-pin) { z-index: 3; }
gb-table.gb-table-scrolled .gb-table-pin-end::after {
  content: ""; position: absolute; inset-block: 0; inset-inline-end: 0; inline-size: 1px; background: var(--border);
}
gb-table .gb-table-drop { display: none; }
gb-table .gb-table-num { text-align: end; }

.gb-table-sort {
  display: inline-flex; align-items: center; gap: 4px; margin: 0 -4px; padding: 0 4px; vertical-align: bottom; border: 0; border-radius: var(--r-chip);
  background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.gb-table-num > .gb-table-sort { flex-direction: row-reverse; }
.gb-table-sort:hover, [aria-sort] > .gb-table-sort { color: var(--soft); }
.gb-table-sort:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.gb-table-sort > svg { inline-size: 10px; block-size: 10px; opacity: 0; }
.gb-table-sort:is(:hover, :focus-visible) > svg { opacity: 0.6; }
[aria-sort] > .gb-table-sort > svg { opacity: 1; }
[aria-sort="ascending"] > .gb-table-sort > svg { rotate: 180deg; }

/* Phones step up to comfortable, with 40px rows to tap. A sort button's tap area grows past its
   label without moving it, so every header label stays on one line. */
@media (pointer: coarse), (max-width: 560px) {
  gb-table :is(th, td) { block-size: 40px; padding-inline: 12px; }
  gb-table th { block-size: 36px; }
  .gb-table-sort { position: relative; }
  .gb-table-sort::after { content: ""; position: absolute; inset: -14px -4px -6px; }
}`;

const adoptStyles = lightStyles(styles);
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

// Plain selectors rather than `rows` and `cells`, which not every DOM (happy-dom) implements.
const cellsOf = (row: Element) => [
  ...row.querySelectorAll<HTMLTableCellElement>(":scope > :is(th, td)"),
];
const bodiesOf = (table: HTMLTableElement) => [...table.querySelectorAll(":scope > tbody")];
const rowsOf = (body: Element) => [...body.querySelectorAll<HTMLTableRowElement>(":scope > tr")];

/** A whole-number span attribute, at least 1; 0 for a `rowspan="0"` (to the section's end). */
function span(cell: Element, name: "colspan" | "rowspan"): number {
  const value = Math.floor(Number(cell.getAttribute(name) ?? "1"));
  if (name === "rowspan" && value === 0) return 0;
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

/** The table laid out in columns the way the browser does it, `colspan` and `rowspan` included. */
interface Grid {
  /** Each row's cell in every column it covers, by row. */
  readonly slots: Map<HTMLTableRowElement, HTMLTableCellElement[]>;
  /** The header cell over each column: the one covering it in the bottom header row. */
  readonly headers: HTMLTableCellElement[];
  /** Each column's cells that sit in that column alone, top to bottom. */
  readonly columns: HTMLTableCellElement[][];
  /** Columns under a cell that spans several: hiding them would hide the wrong cells. */
  readonly spanned: ReadonlySet<number>;
  /** True when the rows don't all come to the same number of columns. */
  readonly ragged: boolean;
}

function gridOf(table: HTMLTableElement): Grid {
  const slots = new Map<HTMLTableRowElement, HTMLTableCellElement[]>();
  const starts: { cell: HTMLTableCellElement; column: number; width: number }[] = [];
  const widths: number[] = [];
  let headerRow: HTMLTableCellElement[] = [];
  for (const section of table.querySelectorAll(":scope > :is(thead, tbody, tfoot)")) {
    const rows = rowsOf(section);
    const grid: HTMLTableCellElement[][] = rows.map(() => []);
    rows.forEach((row, r) => {
      const line = grid[r] ?? [];
      let column = 0;
      for (const cell of cellsOf(row)) {
        while (line[column]) column++;
        const width = span(cell, "colspan");
        const down = span(cell, "rowspan") || rows.length - r;
        for (let dr = 0; dr < down && r + dr < rows.length; dr++)
          for (let dc = 0; dc < width; dc++) (grid[r + dr] ?? [])[column + dc] ??= cell;
        starts.push({ cell, column, width });
        column += width;
      }
    });
    rows.forEach((row, r) => {
      const line = grid[r] ?? [];
      slots.set(row, line);
      // a gap in the row counts as ragged too: a later cell sits right of where it's counted
      widths.push(line.includes(undefined as never) ? -1 : line.length);
    });
    if (section.localName === "thead") headerRow = grid.at(-1) ?? [];
  }
  const count = headerRow.length || (widths[0] ?? 0);
  const columns: HTMLTableCellElement[][] = Array.from({ length: count }, () => []);
  const spanned = new Set<number>();
  for (const { cell, column, width } of starts) {
    if (width === 1) columns[column]?.push(cell);
    else for (let c = column; c < column + width; c++) spanned.add(c);
  }
  return {
    slots,
    headers: headerRow,
    columns,
    spanned,
    ragged: widths.some((width) => width !== count),
  };
}

/** A cell's sort value: `data-value` if it has one, else its text. */
function cellValue(cell: Element | undefined): string {
  if (!(cell instanceof HTMLElement)) return "";
  return (cell.dataset.value ?? cell.textContent ?? "").trim();
}

/** "2,871", "54%" or "−11" as a number; NaN when there's no number in it. */
function toNumber(text: string): number {
  const cleaned = text.replace(/−/g, "-").replace(/[^\d.-]/g, "");
  return cleaned === "" ? Number.NaN : Number(cleaned);
}

/**
 * The columns that may drop, in the order they go: low, then medium, each from the right. None when
 * the rows don't line up, and never one under a cell spanning several columns.
 */
function dropOrder(grid: Grid, lead: number): number[] {
  if (grid.ragged) return [];
  const order: number[] = [];
  for (const level of ["low", "medium"])
    for (let index = grid.headers.length - 1; index >= lead; index--)
      if (grid.headers[index]?.dataset.priority === level && !grid.spanned.has(index))
        order.push(index);
  return order;
}

/**
 * `<gb-table>`: a data table. Wrap a plain `<table>` in it:
 *
 * ```html
 * <gb-table>
 *   <table>
 *     <thead><tr><th data-sort>Map</th><th data-sort data-type="number" aria-sort="descending">Goals</th></tr></thead>
 *     <tbody><tr><td>Ayutthaya</td><td>14</td></tr></tbody>
 *   </table>
 * </gb-table>
 * ```
 *
 * Compact rows with tabular numbers and every other row raised; 40px rows on phones. A table wider
 * than its box first drops its low-priority columns, then scrolls sideways with the first column held
 * in place, behind a thin edge.
 *
 * - `data-priority="low"` on a header: that column drops out when the table doesn't fit its box
 *   (the box, not the window), before anything scrolls. `data-priority="medium"` columns drop next.
 *   Within a level the rightmost column goes first, one at a time, and they come back when there's
 *   room again. A dropped column can't be shown on that screen, so mark only a column people can do
 *   without there: never the row's name, its main value, or anything they need to read.
 * - A row header (`<th scope="row">`) in the first three columns is held in place with the columns
 *   before it, so a place column doesn't scroll the names away.
 * - `data-type="number"` on a header: that column lines up on the right and sorts as numbers.
 * - `data-sort` on a header makes it a button. Picking it sorts by that column, numbers high to low
 *   first and text A to Z, and again reverses it. The table fires a cancelable `sort` event
 *   ({@link SortDetail}) first; cancel it to sort on the server instead. A cell's `data-value`, if
 *   set, is sorted on instead of its text (a date, say).
 * - `aria-sort` on a header marks how the rows came sorted. The table keeps it up to date.
 * - `sticky`: the header row stays in view. The table scrolls inside its own box then, up to
 *   `--gb-table-height` tall (70vh by default).
 *
 * Columns are laid out as the browser does, through `thead`, every `tbody` and `tfoot`, `colspan`
 * and `rowspan` included. A column under a cell spanning several columns never drops, and when the
 * rows don't come to the same number of columns nothing drops: the table scrolls instead.
 */
export class GbTable extends HTMLElement {
  #observer: MutationObserver | undefined;
  #resize: ResizeObserver | undefined;
  #width = -1;

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    this.addEventListener("click", this.#onClick);
    this.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#sync();
    this.#observer ??= new MutationObserver(() => {
      this.#sync();
    });
    this.#observer.observe(this, { childList: true, subtree: true });
    if (typeof ResizeObserver !== "undefined") {
      // Only a new width changes what fits; dropping a column can change the height.
      this.#resize ??= new ResizeObserver(() => {
        if (this.clientWidth === this.#width) return;
        this.#width = this.clientWidth;
        this.fit();
      });
      this.#resize.observe(this);
    }
    // Columns get wider once the font is in.
    if ("fonts" in document)
      void document.fonts.ready.then(() => {
        this.fit();
      });
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("scroll", this.#onScroll);
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#resize?.disconnect();
    this.#resize = undefined;
    this.#width = -1;
  }

  /**
   * Fits the table to its box: shows every column, drops low-priority ones until it fits, and holds
   * the lead columns in place. Runs by itself when the box's width or the rows change.
   */
  fit(): void {
    const table = this.table;
    if (!table) return;
    const grid = gridOf(table);
    const { headers, columns } = grid;
    const lead = this.#leadColumns(table, grid);
    for (const cell of table.querySelectorAll(".gb-table-drop"))
      cell.classList.remove("gb-table-drop");
    // A table with no width (hidden, or not laid out) can't tell what fits.
    if (this.clientWidth > 0)
      for (const index of dropOrder(grid, lead)) {
        if (this.scrollWidth <= this.clientWidth) break;
        for (const cell of columns[index] ?? []) cell.classList.add("gb-table-drop");
      }
    let start = 0;
    columns.forEach((cells, index) => {
      const pinned = index < lead;
      for (const cell of cells) {
        cell.classList.toggle("gb-table-pin", pinned);
        cell.classList.toggle("gb-table-pin-end", index === lead - 1);
        if (pinned && index > 0) cell.style.insetInlineStart = `${start}px`;
        else cell.style.removeProperty("inset-inline-start");
      }
      if (pinned) start += headers[index]?.offsetWidth ?? 0;
    });
    this.#onScroll();
    this.#observer?.takeRecords();
  }

  /** How many columns stay in place: up to a row header in the first three, else the first. */
  #leadColumns(table: HTMLTableElement, grid: Grid): number {
    const row = table.querySelector<HTMLTableRowElement>(":scope > tbody > tr");
    const slots = row ? (grid.slots.get(row) ?? []) : [];
    const header = slots.findIndex((cell) => cell?.tagName === "TH");
    return header >= 0 && header < 3 ? header + 1 : 1;
  }

  readonly #onScroll = (): void => {
    this.classList.toggle("gb-table-scrolled", Math.abs(this.scrollLeft) >= 1);
  };

  /** The `<table>` inside. */
  get table(): HTMLTableElement | null {
    return this.querySelector(":scope > table");
  }

  /**
   * The header over each column: the cell covering it in the bottom header row, which may come
   * down from a row above (`rowspan`), or cover several columns (`colspan`).
   */
  get headers(): HTMLTableCellElement[] {
    const table = this.table;
    return table ? gridOf(table).headers : [];
  }

  /** Sorts the rows by column `column`, as if its header were picked, but fires no event. */
  sort(column: number, direction: SortDirection): void {
    const table = this.table;
    if (!table) return;
    this.#mark(column, direction);
    const grid = gridOf(table);
    const numeric = grid.headers[column]?.dataset.type === "number";
    const flip = direction === "ascending" ? 1 : -1;
    for (const body of bodiesOf(table)) {
      const rows = rowsOf(body).map((row) => {
        const text = cellValue(grid.slots.get(row)?.[column]);
        return { row, text, number: numeric ? toNumber(text) : Number.NaN };
      });
      rows.sort((a, b) => {
        if (numeric) {
          // Rows with no number go last either way.
          if (Number.isNaN(a.number) || Number.isNaN(b.number))
            return Number(Number.isNaN(a.number)) - Number(Number.isNaN(b.number));
          return (a.number - b.number) * flip;
        }
        if (!a.text || !b.text) return Number(!a.text) - Number(!b.text);
        return collator.compare(a.text, b.text) * flip;
      });
      body.append(...rows.map(({ row }) => row));
    }
    this.#observer?.takeRecords();
  }

  #mark(column: number, direction: SortDirection): void {
    this.headers.forEach((header, index) => {
      if (index === column) header.setAttribute("aria-sort", direction);
      else header.removeAttribute("aria-sort");
    });
  }

  #sync(): void {
    const table = this.table;
    if (!table) return;
    const grid = gridOf(table);
    const headers = grid.headers;
    for (const header of new Set(headers)) {
      if (!("sort" in header.dataset) || header.querySelector(":scope > .gb-table-sort")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gb-table-sort";
      button.append(...header.childNodes);
      button.insertAdjacentHTML("beforeend", chevron);
      header.append(button);
    }
    const numeric = new Set(
      headers.flatMap((header, index) => (header.dataset.type === "number" ? [index] : [])),
    );
    headers.forEach((header, index) => {
      header.classList.toggle("gb-table-num", numeric.has(index));
    });
    grid.columns.forEach((cells, index) => {
      for (const cell of cells) cell.classList.toggle("gb-table-num", numeric.has(index));
    });
    this.fit();
  }

  readonly #onClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest(".gb-table-sort") : null;
    const header = button?.parentElement;
    if (!(header instanceof HTMLTableCellElement)) return;
    const column = this.headers.indexOf(header);
    if (column < 0) return;
    const current = header.getAttribute("aria-sort");
    const direction: SortDirection =
      current === "ascending"
        ? "descending"
        : current === "descending"
          ? "ascending"
          : header.dataset.type === "number"
            ? "descending"
            : "ascending";
    const detail: SortDetail = { column, direction };
    const proceed = this.dispatchEvent(
      new CustomEvent("sort", { detail, bubbles: true, cancelable: true }),
    );
    if (proceed) this.sort(column, direction);
    else this.#mark(column, direction);
  };
}

defineElement("gb-table", GbTable);
