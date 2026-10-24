import { defineElement } from "./define.js";

// The field has no shadow root: the control stays a native element in the page, so it submits with
// its form, autofills, works with password managers and can be named by a real <label for>, none
// of which crosses a shadow boundary. Its styles are adopted once into the document (or the shadow
// root the field sits in) instead.
const styles = `gb-field { display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; }
gb-field[hidden] { display: none; }
.gb-field-label { font-size: 0.74rem; font-weight: 600; color: var(--soft); }
.gb-field-error { font-size: 0.72rem; color: var(--down); }
.gb-field-error:empty { display: none; }

gb-field > :is(input, select, textarea) {
  grid-area: 2 / 1; inline-size: 100%; min-inline-size: 0; block-size: 36px; margin: 0; padding: 0 10px;
  border: 1px solid var(--control-border); border-radius: var(--r); background: var(--raised); color: var(--fg);
  font: inherit; font-size: 0.86rem;
}
gb-field > textarea { block-size: auto; min-block-size: 80px; padding: 8px 10px; resize: vertical; }
gb-field > select { appearance: none; padding-inline-end: 32px; cursor: pointer; }
/* Autofill keeps the raised fill instead of the browser's own colour. */
gb-field > input:autofill { box-shadow: inset 0 0 0 100px var(--raised); -webkit-text-fill-color: var(--fg); caret-color: var(--fg); }
gb-field > :is(input, select, textarea)::placeholder { color: var(--muted); opacity: 1; }
gb-field > :is(input, select, textarea):hover:not(:disabled) { border-color: var(--muted); }
gb-field > :is(input, select, textarea, .gb-field-mark) { -webkit-tap-highlight-color: transparent; }
gb-field > :is(input, select, textarea):focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
gb-field > [aria-invalid="true"], gb-field > [aria-invalid="true"]:hover:not(:disabled) { border-color: var(--down); }
gb-field:has(> :disabled) { opacity: 0.5; }
gb-field > :disabled { cursor: not-allowed; }

/* The chevron, the tick and the switch's knob are drawn by a mark next to the control, in its cell. */
.gb-field-mark { grid-area: 2 / 1; pointer-events: none; color: var(--soft); }
.gb-field-mark svg { display: block; inline-size: 100%; block-size: 100%; }
gb-field > select + .gb-field-mark { place-self: center end; inline-size: 12px; block-size: 12px; margin-inline-end: 12px; }

/* Checkbox and switch: the box, then the label beside it, the error under both. */
gb-field:has(> [type="checkbox"]) { grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; align-items: center; }
gb-field:has(> [type="checkbox"]) > .gb-field-label { grid-area: 1 / 2; font-size: 0.86rem; font-weight: 400; color: var(--fg); cursor: pointer; }
gb-field:has(> [type="checkbox"]) > .gb-field-error { grid-area: 2 / 1 / 3 / 3; }
gb-field:has(> :disabled) > .gb-field-label { cursor: not-allowed; }
gb-field > [type="checkbox"] {
  grid-area: 1 / 1; appearance: none; inline-size: 18px; block-size: 18px; padding: 0;
  border-radius: var(--r-chip); cursor: pointer;
}
gb-field > [type="checkbox"]:checked { background: var(--green); border-color: var(--green); }
gb-field > [type="checkbox"] + .gb-field-mark { grid-area: 1 / 1; place-self: center; inline-size: 12px; block-size: 12px; color: var(--bg); visibility: hidden; }
gb-field > [type="checkbox"]:checked + .gb-field-mark { visibility: visible; }

gb-field > [role="switch"] { inline-size: 34px; block-size: 20px; border-radius: 10px; }
gb-field > [role="switch"] + .gb-field-mark {
  justify-self: start; inline-size: 12px; block-size: 12px; margin-inline-start: 4px;
  border-radius: 50%; background: var(--soft); visibility: visible; transition: translate 0.15s ease-out;
}
gb-field > [role="switch"]:checked + .gb-field-mark { translate: 14px 0; background: var(--bg); }
gb-field:dir(rtl) > [role="switch"]:checked + .gb-field-mark { translate: -14px 0; }

/* Tap targets on phones and tablets: at least 40px tall. */
@media (pointer: coarse) {
  gb-field > :is(input, select) { block-size: 40px; }
  gb-field:has(> [type="checkbox"]) { min-block-size: 40px; }
}
@media (prefers-reduced-motion: reduce) { .gb-field-mark { transition: none; } }`;

const chevron = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>`;
const tick = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3 5 8.7l4.5-5"/></svg>`;

let sheet: CSSStyleSheet | undefined;
const styled = new WeakSet<Node>();

/** Adopts the field's stylesheet into the document or shadow root the field is in, once. */
function adoptStyles(root: Node): void {
  // A field not yet in a document or shadow root has nothing to adopt into.
  if (!("adoptedStyleSheets" in root) || styled.has(root)) return;
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(styles);
  }
  const target = root as Document | ShadowRoot;
  target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
  styled.add(root);
}

let nextId = 0;

/**
 * `<gb-field label="BattleTag"><input name="battletag"></gb-field>`: a form control with its label
 * above and its error below, from brand.md's Inputs. Wraps one native `<input>`, `<select>` or
 * `<textarea>`, which stays the real control: give it its `name`, `value` and `required` as usual.
 *
 * - `label`: the control's name, shown above it (beside it for a checkbox or switch). Required: a
 *   placeholder is never the only label.
 * - `error`: what's wrong and how to fix it, shown under the control in orange with ⚠. The control
 *   gets `aria-invalid` and is described by it. Remove the attribute when it's fixed.
 *
 * `<input type="checkbox">` is a checkbox, `<input type="checkbox" role="switch">` a toggle.
 */
export class GbField extends HTMLElement {
  static readonly observedAttributes = ["label", "error"];

  readonly #id = `gb-field-${nextId++}`;
  readonly #label = document.createElement("label");
  readonly #error = document.createElement("p");
  readonly #mark = document.createElement("span");
  #control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
  // A field defined before the parser reaches its children waits for the control to arrive.
  #observer: MutationObserver | undefined;

  constructor() {
    super();
    this.#label.className = "gb-field-label";
    this.#error.className = "gb-field-error";
    this.#error.id = `${this.#id}-error`;
    this.#mark.className = "gb-field-mark";
    this.#mark.setAttribute("aria-hidden", "true");
  }

  connectedCallback(): void {
    adoptStyles(this.getRootNode());
    if (!this.#attach()) {
      this.#observer ??= new MutationObserver(() => {
        if (this.#attach()) this.#stopObserving();
      });
      this.#observer.observe(this, { childList: true });
    }
  }

  disconnectedCallback(): void {
    this.#stopObserving();
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

  get error(): string {
    return this.getAttribute("error") ?? "";
  }

  /** Setting an empty string removes the error. */
  set error(value: string) {
    if (value) this.setAttribute("error", value);
    else this.removeAttribute("error");
  }

  /** The native control inside, once there is one. */
  get control(): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined {
    return this.#control;
  }

  /** Finds the control and puts the label, mark and error around it. False while there's none. */
  #attach(): boolean {
    const control = this.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      ":scope > :is(input, select, textarea)",
    );
    if (!control) return false;
    this.#control = control;
    control.id ||= this.#id;
    this.#label.htmlFor = control.id;
    this.prepend(this.#label);
    // A select gets a chevron, a checkbox a tick and a switch its knob; text fields need no mark.
    const isCheckbox = control instanceof HTMLInputElement && control.type === "checkbox";
    if (control instanceof HTMLSelectElement || isCheckbox) {
      const isSwitch = control.getAttribute("role") === "switch";
      this.#mark.innerHTML = isCheckbox ? (isSwitch ? "" : tick) : chevron;
      control.after(this.#mark);
    } else this.#mark.remove();
    this.append(this.#error);
    this.#render();
    return true;
  }

  #render(): void {
    this.#label.textContent = this.label;
    const error = this.error.trim();
    this.#error.textContent = error ? `⚠ ${error}` : "";
    const control = this.#control;
    if (!control) return;
    // Keeps whatever else the app described the control with; only adds and removes the error.
    const describedBy = (control.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter((id) => id && id !== this.#error.id);
    if (error) describedBy.push(this.#error.id);
    if (describedBy.length > 0) control.setAttribute("aria-describedby", describedBy.join(" "));
    else control.removeAttribute("aria-describedby");
    if (error) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  }

  #stopObserving(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }
}

defineElement("gb-field", GbField);
