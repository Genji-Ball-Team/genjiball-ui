import "./chip.js";
import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { follow, lower, raise } from "./overlay.js";
import { maxResults, optionRow } from "./search-parts.js";
import type { SearchItem, SearchQuery } from "./search-parts.js";
import { lens, styles } from "./search-styles.js";

export { maxResults };
export type { SearchItem, SearchQuery };

const adoptStyles = lightStyles(styles);

let nextId = 0;

/**
 * `<gb-search label="Find a player" shortcut="/">`: the search box from brand.md's Inputs, an ARIA
 * combobox: an input and, below it, a list of suggestions (at most {@link maxResults}) that the
 * app supplies as the user types.
 *
 * ```ts
 * search.addEventListener("query", (event) => {
 *   const { query, signal, answer, fail } = event.detail;
 *   fetch(`/players?search=${encodeURIComponent(query)}`, { signal })
 *     .then((response) => response.json())
 *     .then((players) => answer(players), () => fail());
 * });
 * search.addEventListener("pick", (event) => console.log(event.detail.name));
 * ```
 *
 * - `label`: the box's name, shown above it. `hide-label` keeps it for screen readers only, for
 *   when the page heading says what the box searches.
 * - `placeholder`, `name`, `value`, `disabled`: as on the input, which is a real `<input>` in the
 *   page and fires its own `input` and `change` events.
 * - `shortcut`: a key (`/`) that focuses the box from anywhere on the page outside a text field,
 *   shown as a small hint inside the box while it's empty and not focused. Never shown on touch
 *   screens. Use it only on a page with one main search.
 * - `filter`: no list. The box only filters the page itself: listen to `input`.
 * - `min-length` (default 1): the shortest query that asks for suggestions. `delay` (default 150,
 *   in ms): the pause after typing before it does.
 * - `empty`: the start of the "no results" line (default "No one called"), which ends with the
 *   query in quotes.
 * - `error`: a line shown in the list instead of suggestions, in orange. Cleared by the next query.
 * - `loading`: a query is out; set by the component between `query` and the answer, or by you.
 *
 * Events:
 * - `query` (detail: {@link SearchQuery}): ask for suggestions. Its `answer` and `fail` ignore
 *   answers to a query that's no longer the current one.
 * - `pick` (detail: the {@link SearchItem}; cancelable): an item was chosen by click or Enter. An
 *   item with an `href` is a link, so it goes there unless you cancel the event.
 *
 * Keys: ↓ and ↑ move through the list (round the end), Home and End go to the first and last while
 * an item is active, Enter chooses it, Escape closes the list and then clears the box.
 */
export class GbSearch extends HTMLElement {
  static readonly observedAttributes = [
    "label",
    "placeholder",
    "name",
    "value",
    "disabled",
    "shortcut",
    "loading",
    "error",
    "empty",
    "filter",
  ];

  readonly #id = `gb-search-${nextId++}`;
  readonly #label = document.createElement("label");
  readonly #box = document.createElement("div");
  readonly #input = document.createElement("input");
  readonly #hint = document.createElement("kbd");
  readonly #popup = document.createElement("div");
  readonly #list = document.createElement("ul");
  readonly #note = document.createElement("p");
  readonly #live = document.createElement("span");
  #items: readonly SearchItem[] = [];
  // The query the items answer, which the highlight follows; undefined until something answers.
  #answered: string | undefined;
  #active = -1;
  // Whether the user wants the list: typing or arrows open it, Escape, a pick and blur close it.
  #wanted = false;
  #shown = false;
  #request = 0;
  #controller: AbortController | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #stop: (() => void) | undefined;

  constructor() {
    super();
    const id = this.#id;
    this.#label.className = "gb-search-label";
    this.#label.htmlFor = `${id}-input`;
    this.#box.className = "gb-search-box";
    this.#input.id = `${id}-input`;
    this.#input.type = "search";
    this.#input.autocomplete = "off";
    this.#input.spellcheck = false;
    this.#input.enterKeyHint = "search";
    this.#input.setAttribute("autocapitalize", "off");
    this.#hint.setAttribute("aria-hidden", "true");
    this.#popup.className = "gb-search-popup";
    this.#popup.hidden = true;
    // Clicking the list must not take focus from the box.
    this.#popup.addEventListener("mousedown", (event) => event.preventDefault());
    this.#popup.addEventListener("click", this.#onPopupClick);
    this.#list.className = "gb-search-list";
    this.#list.id = `${id}-list`;
    this.#list.setAttribute("role", "listbox");
    this.#note.className = "gb-search-note";
    this.#live.className = "gb-search-live";
    this.#live.setAttribute("role", "status");
    this.#popup.append(this.#list, this.#note);
    this.#box.insertAdjacentHTML("afterbegin", lens);
    this.#box.append(this.#input, this.#hint);
    this.#input.addEventListener("input", this.#onInput);
    this.#input.addEventListener("keydown", this.#onKeydown);
    this.#input.addEventListener("focus", () => {
      this.#wanted = true;
      this.#sync();
    });
    this.addEventListener("focusout", this.#onFocusOut);
  }

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    this.append(this.#label, this.#box, this.#popup, this.#live);
    document.addEventListener("keydown", this.#onShortcut);
    this.#render();
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.#onShortcut);
    this.#cancel();
    this.#wanted = false;
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }

  set label(value: string) {
    this.setAttribute("label", value);
  }

  /** The native input inside. */
  get input(): HTMLInputElement {
    return this.#input;
  }

  get value(): string {
    return this.#input.value;
  }

  /** Sets the text without asking for suggestions (restoring the box from the address, say). */
  set value(value: string) {
    this.#input.value = value;
    this.#render();
  }

  get loading(): boolean {
    return this.hasAttribute("loading");
  }

  set loading(value: boolean) {
    this.toggleAttribute("loading", value);
  }

  get error(): string {
    return this.getAttribute("error") ?? "";
  }

  /** Setting an empty string removes the error. */
  set error(value: string) {
    if (value) this.setAttribute("error", value);
    else this.removeAttribute("error");
  }

  /** The suggestions shown, at most {@link maxResults}. */
  get results(): readonly SearchItem[] {
    return this.#items;
  }

  /** Shows these as the answer to what's typed now. For answers to a `query`, use its `answer`. */
  set results(items: readonly SearchItem[]) {
    this.#items = items.slice(0, maxResults);
    this.#answered = this.#query();
    this.#active = -1;
    this.error = "";
    this.loading = false;
    this.#renderList();
    this.#sync();
  }

  /** Whether the list is showing. */
  get open(): boolean {
    return this.#shown;
  }

  /** Puts the cursor in the box. */
  override focus(options?: FocusOptions): void {
    this.#input.focus(options);
  }

  #query(): string {
    return this.#input.value.trim();
  }

  get #filter(): boolean {
    return this.hasAttribute("filter");
  }

  get #min(): number {
    return Math.max(1, Number(this.getAttribute("min-length")) || 1);
  }

  /** Takes the attributes and the typed text to the parts. */
  #render(): void {
    this.#label.textContent = this.label;
    const input = this.#input;
    input.placeholder = this.getAttribute("placeholder") ?? "";
    const name = this.getAttribute("name");
    if (name === null) input.removeAttribute("name");
    else input.name = name;
    if (this.hasAttribute("value") && this.getAttribute("value") !== input.defaultValue)
      input.value = this.getAttribute("value") ?? "";
    input.disabled = this.hasAttribute("disabled");
    this.#hint.textContent = this.getAttribute("shortcut") ?? "";
    this.toggleAttribute("data-filled", input.value !== "");
    input.setAttribute("aria-busy", String(this.loading));
    if (this.#filter) {
      input.removeAttribute("role");
      for (const attribute of ["aria-autocomplete", "aria-expanded", "aria-controls"])
        input.removeAttribute(attribute);
    } else {
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-controls", this.#list.id);
    }
    this.#renderList();
    this.#sync();
  }

  /** Builds the rows from the items; the matching part of each name is bold. */
  #renderList(): void {
    const query = (this.#answered ?? this.#query()).toLowerCase();
    this.#list.replaceChildren(
      ...this.#items.map((item, index) => {
        const row = optionRow(item, query);
        row.id = `${this.#id}-option-${index}`;
        row.setAttribute("aria-selected", String(index === this.#active));
        row.toggleAttribute("data-active", index === this.#active);
        return row;
      }),
    );
  }

  /** The line shown when there's nothing to list, and whether it's an error. */
  #noteText(): { text: string; error: boolean } {
    const error = this.error.trim();
    if (error) return { text: `⚠ ${error}`, error: true };
    if (this.#items.length > 0) return { text: "", error: false };
    if (this.loading) return { text: "Searching…", error: false };
    if (this.#answered === undefined || this.#answered === "") return { text: "", error: false };
    return {
      text: `${this.getAttribute("empty") ?? "No one called"} “${this.#answered}”.`,
      error: false,
    };
  }

  /** Opens or closes the list to match the state, and keeps the input's ARIA attributes true. */
  #sync(): void {
    const { text, error } = this.#noteText();
    this.#note.textContent = text;
    this.#note.toggleAttribute("data-error", error);
    const input = this.#input;
    const hasContent = this.#items.length > 0 || text !== "";
    const show =
      this.isConnected &&
      !this.#filter &&
      !input.disabled &&
      this.#wanted &&
      this.#query().length >= this.#min &&
      hasContent;
    if (show && !this.#shown) {
      this.#shown = true;
      this.#popup.style.minInlineSize = `${Math.round(this.#box.getBoundingClientRect().width)}px`;
      raise(this.#popup);
      this.#stop = follow(this.#popup, this.#box);
    } else if (!show && this.#shown) {
      this.#shown = false;
      this.#stop?.();
      this.#stop = undefined;
      lower(this.#popup);
    }
    if (!this.#filter) input.setAttribute("aria-expanded", String(this.#shown));
    this.#popup.setAttribute("aria-busy", String(this.loading && this.#items.length > 0));
    if (this.#active >= this.#items.length || !this.#shown) this.#active = -1;
    this.#markActive();
    // The count or the line is what a screen reader hears; the list itself is not live.
    const count = this.#items.length;
    this.#live.textContent = !this.#shown
      ? ""
      : count > 0
        ? `${count} ${count === 1 ? "result" : "results"}`
        : text;
  }

  /** Moves the active item (the input's `aria-activedescendant`) to `index`, or to none. */
  #activate(index: number): void {
    this.#active = index;
    this.#markActive();
  }

  #markActive(): void {
    const rows = [...this.#list.children];
    rows.forEach((row, index) => {
      row.setAttribute("aria-selected", String(index === this.#active));
      row.toggleAttribute("data-active", index === this.#active);
    });
    const active = rows[this.#active];
    if (active) {
      this.#input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView?.({ block: "nearest" });
    } else this.#input.removeAttribute("aria-activedescendant");
  }

  /** Drops the pending and the running query, so no answer to them gets in. */
  #cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#controller?.abort();
    this.#controller = undefined;
    this.#request++;
  }

  /** Asks the app for suggestions for what's typed now. */
  #ask(): void {
    const query = this.#query();
    const request = ++this.#request;
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    const current = () => request === this.#request && !controller.signal.aborted;
    this.error = "";
    this.loading = true;
    this.dispatchEvent(
      new CustomEvent<SearchQuery>("query", {
        bubbles: true,
        detail: {
          query,
          signal: controller.signal,
          answer: (items) => {
            if (!current()) return;
            this.#items = items.slice(0, maxResults);
            this.#answered = query;
            this.#active = -1;
            this.loading = false;
            this.#renderList();
            this.#sync();
          },
          fail: (message = "The search didn't load. Try again.") => {
            if (!current()) return;
            this.#items = [];
            this.#answered = query;
            this.loading = false;
            this.error = message;
            this.#renderList();
            this.#sync();
          },
        },
      }),
    );
  }

  /** Chooses the item at `index`; a link goes to its page unless the app cancels `pick`. */
  #choose(index: number, event?: MouseEvent): void {
    const item = this.#items[index];
    if (!item) return;
    const picked = this.dispatchEvent(
      new CustomEvent("pick", { bubbles: true, cancelable: true, detail: item }),
    );
    if (!picked) event?.preventDefault();
    this.#wanted = false;
    this.#sync();
  }

  readonly #onInput = (): void => {
    this.toggleAttribute("data-filled", this.#input.value !== "");
    this.#wanted = true;
    this.#active = -1;
    if (this.#filter) return;
    this.#cancel();
    if (this.#query().length < this.#min) {
      this.#items = [];
      this.#answered = undefined;
      this.loading = false;
      this.error = "";
      this.#renderList();
      this.#sync();
      return;
    }
    this.#sync();
    const delay = Number(this.getAttribute("delay") ?? 150);
    if (delay > 0) this.#timer = setTimeout(() => this.#ask(), delay);
    else this.#ask();
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const last = this.#items.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (this.#filter) return;
        event.preventDefault();
        if (!this.#shown) {
          this.#wanted = true;
          this.#sync();
          if (!this.#shown) return;
        }
        const down = event.key === "ArrowDown";
        this.#activate(
          this.#active < 0
            ? down
              ? 0
              : last
            : (this.#active + (down ? 1 : -1) + this.#items.length) % this.#items.length,
        );
        return;
      }
      case "Home":
      case "End":
        // Without an active item they move the cursor in the text, as in any input.
        if (!this.#shown || this.#active < 0) return;
        event.preventDefault();
        this.#activate(event.key === "Home" ? 0 : last);
        return;
      case "Enter":
        if (!this.#shown || this.#active < 0) return;
        event.preventDefault();
        this.#rowAt(this.#active)?.click();
        return;
      case "Escape":
        // Closes the list first, then clears the box. Stops here only when it did something, so
        // a dialog the box is in still closes on the last press.
        if (this.#shown) {
          this.#wanted = false;
          this.#sync();
        } else if (this.#input.value !== "") {
          this.#input.value = "";
          this.#input.dispatchEvent(new Event("input", { bubbles: true }));
        } else return;
        event.preventDefault();
        event.stopPropagation();
        return;
      default:
    }
  };

  #rowAt(index: number): HTMLElement | undefined {
    const row = this.#list.children[index];
    return row instanceof HTMLElement ? row : undefined;
  }

  readonly #onPopupClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest("[role=option]");
    const index = row ? [...this.#list.children].indexOf(row) : -1;
    if (index >= 0) this.#choose(index, event);
  };

  readonly #onFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Node && this.contains(to)) return;
    this.#wanted = false;
    this.#sync();
  };

  /** The page-wide shortcut key: focuses the box unless the user is typing somewhere. */
  readonly #onShortcut = (event: KeyboardEvent): void => {
    const key = this.getAttribute("shortcut");
    if (!key || event.key !== key || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || this.#input.disabled) return;
    const origin = event.composedPath()[0];
    if (origin instanceof Element && origin.closest("input, textarea, select, [contenteditable]"))
      return;
    if (typeof this.checkVisibility === "function" && !this.checkVisibility()) return;
    event.preventDefault();
    this.#input.focus();
    this.#input.select();
  };
}

defineElement("gb-search", GbSearch);
