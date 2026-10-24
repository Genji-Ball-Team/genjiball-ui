import { defineElement } from "./define.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

// Inputs where Enter submits the form, as it does natively.
const submitsOnEnter = new Set([
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
]);

const variants: readonly ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];

// The label, the spinner and the feedback text share one grid cell, so the button is as wide as the
// widest of them and doesn't change width when it gets busy or says "Copied ✓". The label is hidden
// with opacity, not visibility, so it stays the button's name for screen readers.
const styles = `:host { display: inline-block; vertical-align: middle; }
:host([hidden]) { display: none; }
button {
  display: inline-grid; place-items: center; inline-size: 100%; block-size: 36px; padding: 0 14px;
  border: 1px solid transparent; border-radius: var(--r); color: var(--fg);
  font: inherit; font-size: 0.84rem; font-weight: 650; line-height: 1; white-space: nowrap;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
button:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.label, .spinner, .feedback { grid-area: 1 / 1; }
.label { display: inline-flex; align-items: center; gap: 7px; }
.spinner, .feedback { visibility: hidden; }
.spinner {
  inline-size: 1em; block-size: 1em; border: 2px solid currentColor; border-inline-end-color: transparent;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(1turn); } }
:host([busy]) .label, .flashing .label { opacity: 0; }
:host([busy]) .spinner, .flashing .feedback { visibility: visible; }
:host([busy]) .flashing .feedback { visibility: hidden; }
.status { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
:host([busy]) button { cursor: progress; }
:host([disabled]) button { cursor: not-allowed; opacity: 0.5; }

/* Secondary is the default; the other variants override it. */
button { background: var(--raised); border-color: var(--border); }
:host(:not([disabled])) button:hover { background: var(--line); }
:host([variant="primary"]) button { background: var(--green); color: var(--bg); }
:host([variant="primary"]:not([disabled])) button:hover { background: color-mix(in oklch, var(--green) 80%, var(--fg)); }
:host([variant="ghost"]) button { background: none; border-color: transparent; color: var(--soft); padding: 0 8px; }
:host([variant="ghost"]:not([disabled])) button:hover { background: none; color: var(--fg); }
:host([variant="danger"]) button { background: none; border-color: color-mix(in oklch, var(--down) 70%, transparent); color: var(--down); }
:host([variant="danger"]:not([disabled])) button:hover { background: color-mix(in oklch, var(--down) 10%, transparent); }

/* Tap targets on phones and tablets: at least 40px tall. */
@media (pointer: coarse) { button { block-size: 40px; } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }`;

/**
 * `<gb-button variant="primary">Save</gb-button>`: a button in one of the four brand.md styles.
 *
 * - `variant`: `primary` (solid green, at most one per screen), `secondary` (the default), `ghost`
 *   (text only, for small actions) or `danger` (orange outline; the app confirms before acting).
 * - `type`: `button` (the default), `submit` or `reset`. Submit and reset act on the form the
 *   button sits in.
 * - `disabled`: greyed out, can't be focused or clicked.
 * - `busy`: a spinner in place of the label, same width. It stays focusable but ignores clicks.
 *
 * Enter in a text field of the form presses the form's first submit `<gb-button>`, as with a native
 * submit button.
 *
 * `flash("Copied ✓")` shows a short message in place of the label for two seconds, and screen
 * readers hear it.
 */
export class GbButton extends HTMLElement {
  static readonly observedAttributes = ["disabled", "busy"];

  readonly #root = this.attachShadow({ mode: "open", delegatesFocus: true });
  readonly #button = document.createElement("button");
  readonly #feedback = document.createElement("span");
  readonly #status = document.createElement("span");
  #flashTimer: ReturnType<typeof setTimeout> | undefined;
  #form: HTMLFormElement | null = null;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#button.type = "button";
    this.#button.setAttribute("part", "button");
    this.#button.innerHTML = `<span class="label"><slot></slot></span><span class="spinner" aria-hidden="true"></span>`;
    this.#feedback.className = "feedback";
    this.#feedback.setAttribute("aria-hidden", "true");
    this.#button.append(this.#feedback);
    // Screen readers hear the flash from here: inside the button it would also change its name.
    this.#status.className = "status";
    this.#status.setAttribute("role", "status");
    this.#root.append(style, this.#button, this.#status);
    // Registered first, so a busy or disabled button stops the click before the app's own listeners.
    this.addEventListener("click", this.#onClick, { capture: true });
  }

  connectedCallback(): void {
    this.#sync();
    this.#form = this.closest("form");
    this.#form?.addEventListener("keydown", this.#onFormKeydown);
  }

  disconnectedCallback(): void {
    this.#form?.removeEventListener("keydown", this.#onFormKeydown);
    this.#form = null;
    clearTimeout(this.#flashTimer);
    this.#button.classList.remove("flashing");
    this.#feedback.textContent = "";
    this.#status.textContent = "";
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  get variant(): ButtonVariant {
    const value = this.getAttribute("variant");
    return variants.find((variant) => variant === value) ?? "secondary";
  }

  set variant(value: ButtonVariant) {
    this.setAttribute("variant", value);
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }

  get busy(): boolean {
    return this.hasAttribute("busy");
  }

  set busy(value: boolean) {
    this.toggleAttribute("busy", value);
  }

  /** Shows `text` in place of the label for `ms` milliseconds, at the button's current width. */
  flash(text: string, ms = 2000): void {
    clearTimeout(this.#flashTimer);
    this.#feedback.textContent = text;
    this.#status.textContent = text;
    this.#button.classList.add("flashing");
    this.#flashTimer = setTimeout(() => {
      this.#button.classList.remove("flashing");
      this.#feedback.textContent = "";
      this.#status.textContent = "";
    }, ms);
  }

  #sync(): void {
    this.#button.disabled = this.disabled;
    // aria-disabled, not disabled: a busy button keeps focus, so the keyboard user isn't dropped.
    if (this.busy) this.#button.setAttribute("aria-disabled", "true");
    else this.#button.removeAttribute("aria-disabled");
    if (this.busy) this.#button.setAttribute("aria-busy", "true");
    else this.#button.removeAttribute("aria-busy");
  }

  readonly #onClick = (event: MouseEvent): void => {
    if (this.disabled || this.busy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    // A button in a shadow root doesn't belong to the page's form, so submit and reset are done here.
    const type = this.getAttribute("type");
    const form = this.closest("form");
    if (type === "submit") form?.requestSubmit();
    else if (type === "reset") form?.reset();
  };

  // Enter in a text field submits the form through its submit button, but a shadow-DOM button isn't
  // one, so the form's first submit <gb-button> does it instead, unless it's busy or disabled.
  readonly #onFormKeydown = (event: KeyboardEvent): void => {
    const form = this.#form;
    const field = event.composedPath()[0];
    if (!form || event.key !== "Enter" || event.isComposing || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!(field instanceof HTMLInputElement) || !submitsOnEnter.has(field.type)) return;
    if (this.getAttribute("type") !== "submit") return;
    if (form.querySelector('gb-button[type="submit"]') !== this) return;
    // A native submit button in the form is the browser's to press.
    if (form.querySelector('button:not([type]), [type="submit"]:not(gb-button), [type="image"]'))
      return;
    event.preventDefault();
    if (!this.disabled && !this.busy) form.requestSubmit();
  };
}

defineElement("gb-button", GbButton);
