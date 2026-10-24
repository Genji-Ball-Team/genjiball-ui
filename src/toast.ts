import "./button.js";
import { defineElement } from "./define.js";

export type ToastKind = "success" | "error";

export interface ToastOptions {
  /** `success` (the default) goes away after ~4s; `error` stays until closed. */
  kind?: ToastKind;
  /** A button that fixes it ("Retry"). Pressing it runs `run` and closes the toast. */
  action?: { label: string; run: () => void };
}

const kinds: readonly ToastKind[] = ["success", "error"];

/** How long a success toast stays, counted again after the pointer or focus leaves it. */
export const successMs = 4000;

// A live region only speaks about changes made after it's in the page, so a region the first toast
// just created waits this long before saying it.
const announceDelayMs = 100;

const tick = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.4 6.4 11.6 13 4.6"/></svg>`;
const warning = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.9 14.6 13.6H1.4zM8 6.4v3.2M8 11.7v.1"/></svg>`;
const cross = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

// The brand sheet's toast: raised, 1px border, the floating shadow (toasts are on top and
// temporary), an icon in `up` or `down` before the text, the fix button and the close button after.
const toastStyles = `:host {
  display: flex; align-items: center; gap: 10px; box-sizing: border-box; inline-size: min(360px, 100%);
  padding: 7px 7px 7px 12px; border: 1px solid var(--border); border-radius: var(--r);
  background: var(--raised); box-shadow: var(--shadow-float); color: var(--fg);
  font-size: 0.84rem; line-height: 1.35; animation: enter 0.15s ease-out;
}
:host([hidden]) { display: none; }
.icon { flex: none; inline-size: 16px; block-size: 16px; color: var(--up); }
:host([kind="error"]) .icon { color: var(--down); }
.icon svg, .close svg { display: block; inline-size: 100%; block-size: 100%; }
.text { flex: 1; min-inline-size: 0; padding-block: 5px; overflow-wrap: anywhere; }
::slotted([slot="action"]) { flex: none; }
.close {
  flex: none; display: grid; place-items: center; inline-size: 28px; block-size: 28px; margin: 0; padding: 7px;
  border: 0; border-radius: var(--r); background: none; color: var(--muted); cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.close:hover { color: var(--fg); }
.close:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
@keyframes enter { from { opacity: 0; translate: 0 8px; } }
/* Tap targets on phones and tablets: at least 40px tall. */
@media (pointer: coarse) { .close { inline-size: 40px; block-size: 40px; padding: 12px; } }
@media (prefers-reduced-motion: reduce) { :host { animation: none; } }`;

// Bottom right on desktop, bottom centre on phones. The region lets clicks through between toasts.
const regionStyles = `:host {
  position: fixed; inset-block-end: max(16px, env(safe-area-inset-bottom)); inset-inline-end: 16px; z-index: 1000;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  max-inline-size: calc(100vw - 32px); pointer-events: none;
}
::slotted(*) { pointer-events: auto; }
.announce { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 600px) { :host { inset-inline: 12px; align-items: center; max-inline-size: none; } }`;

/**
 * `<gb-toast kind="error">Upload failed. Your log is kept.</gb-toast>`: one toast, for something
 * that happened in the background (brand.md, Feedback). Usually made by {@link toast}, which puts it
 * in the page's `<gb-toast-region>`; screen readers hear it from there.
 *
 * - `kind`: `success` (the default, a ✓ in `up`) closes itself after ~4s, waiting while the pointer
 *   or focus is on it. `error` (a ⚠ in `down`) stays until closed.
 * - A child with `slot="action"`, usually a `<gb-button>`, is the fix ("Retry").
 *
 * The close button and Escape close it, as does `close()`. It fires `close` and leaves the page;
 * focus that was in it goes back to where it came from.
 */
export class GbToast extends HTMLElement {
  static readonly observedAttributes = ["kind"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #icon = document.createElement("span");
  #timer: ReturnType<typeof setTimeout> | undefined;
  #hovered = false;
  #focused = false;
  #returnFocus: HTMLElement | undefined;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = toastStyles;
    this.#icon.className = "icon";
    this.#icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("div");
    text.className = "text";
    text.append(document.createElement("slot"));
    const action = document.createElement("slot");
    action.name = "action";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = cross;
    close.addEventListener("click", () => this.close());
    this.#root.append(style, this.#icon, text, action, close);
    this.addEventListener("pointerenter", () => this.#pause("hovered", true));
    this.addEventListener("pointerleave", () => this.#pause("hovered", false));
    this.addEventListener("focusin", this.#onFocusIn);
    this.addEventListener("focusout", this.#onFocusOut);
    this.addEventListener("keydown", this.#onKeydown);
  }

  connectedCallback(): void {
    this.#render();
  }

  disconnectedCallback(): void {
    clearTimeout(this.#timer);
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get kind(): ToastKind {
    const value = this.getAttribute("kind");
    return kinds.find((kind) => kind === value) ?? "success";
  }

  set kind(value: ToastKind) {
    this.setAttribute("kind", value);
  }

  /** The toast's text, without its action. */
  get message(): string {
    return [...this.childNodes]
      .filter((node) => !(node instanceof Element && node.slot))
      .map((node) => node.textContent)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Takes the toast off the page and fires `close`. */
  close(): void {
    if (!this.isConnected) return;
    clearTimeout(this.#timer);
    const hadFocus = this.contains(document.activeElement) || this.#root.activeElement !== null;
    const returnFocus = this.#returnFocus;
    this.dispatchEvent(new Event("close", { bubbles: true }));
    this.remove();
    if (hadFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  #render(): void {
    this.#icon.innerHTML = this.kind === "error" ? warning : tick;
    this.#schedule();
  }

  #pause(reason: "hovered" | "focused", on: boolean): void {
    if (reason === "hovered") this.#hovered = on;
    else this.#focused = on;
    this.#schedule();
  }

  // A success toast's time only runs while nobody is reading or using it, and starts over after.
  #schedule(): void {
    clearTimeout(this.#timer);
    if (!this.isConnected || this.kind !== "success" || this.#hovered || this.#focused) return;
    this.#timer = setTimeout(() => this.close(), successMs);
  }

  readonly #onFocusIn = (event: FocusEvent): void => {
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !this.contains(from)) this.#returnFocus = from;
    this.#pause("focused", true);
  };

  readonly #onFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Node && this.contains(to)) return;
    this.#pause("focused", false);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    this.close();
  };
}

/**
 * `<gb-toast-region>`: where toasts show, fixed to the bottom right of the page (bottom centre on
 * phones), newest at the bottom. It says each toast to screen readers, errors straight away and
 * successes politely. {@link toast} adds one to the page when there's none; put one in the page's
 * markup to have it there from the start.
 */
export class GbToastRegion extends HTMLElement {
  readonly #root = this.attachShadow({ mode: "open" });
  readonly #polite = document.createElement("div");
  readonly #alert = document.createElement("div");
  readonly #said = new Map<GbToast, HTMLElement>();
  #connectedAt = 0;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = regionStyles;
    const slot = document.createElement("slot");
    slot.addEventListener("slotchange", () => this.#announce(slot));
    // Read out by the region, not by the toasts: a toast's own close and action buttons would be
    // read with it, and a live region added together with its text is often not read at all.
    this.#polite.className = "announce";
    this.#polite.setAttribute("role", "status");
    this.#alert.className = "announce";
    this.#alert.setAttribute("role", "alert");
    this.#root.append(style, slot, this.#polite, this.#alert);
  }

  connectedCallback(): void {
    this.#connectedAt = Date.now();
  }

  #announce(slot: HTMLSlotElement): void {
    const toasts = slot.assignedElements().filter((element) => element instanceof GbToast);
    for (const [toast, line] of this.#said) {
      if (toasts.includes(toast)) continue;
      line.remove();
      this.#said.delete(toast);
    }
    for (const toast of toasts) {
      if (this.#said.has(toast)) continue;
      const line = document.createElement("p");
      this.#said.set(toast, line);
      const say = () => {
        if (this.#said.get(toast) !== line) return;
        line.textContent = toast.message;
        (toast.kind === "error" ? this.#alert : this.#polite).append(line);
      };
      const wait = this.#connectedAt + announceDelayMs - Date.now();
      if (wait > 0) setTimeout(say, wait);
      else say();
    }
  }
}

/**
 * Shows a toast and returns it: `toast("Match uploaded")`, or
 * `toast("Upload failed. Your log is kept.", { kind: "error", action: { label: "Retry", run: retry } })`.
 * Errors say what happened and what to do.
 */
export function toast(message: string, options: ToastOptions = {}): GbToast {
  let region = document.querySelector<GbToastRegion>("gb-toast-region");
  if (!region) {
    region = document.createElement("gb-toast-region") as GbToastRegion;
    document.body.append(region);
  }
  const element = document.createElement("gb-toast") as GbToast;
  if (options.kind) element.kind = options.kind;
  element.append(message);
  const action = options.action;
  if (action) {
    const button = document.createElement("gb-button");
    button.slot = "action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      action.run();
      element.close();
    });
    element.append(button);
  }
  region.append(element);
  return element;
}

defineElement("gb-toast", GbToast);
defineElement("gb-toast-region", GbToastRegion);
