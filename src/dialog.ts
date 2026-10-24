import "./button.js";
import { defineElement } from "./define.js";
import { fadeKeyframes } from "./overlay.js";
import { tokens } from "./tokens.js";

// Centred, at most 440px wide, on the dimmed page. The heading is the question, one plain line says
// what happens, and the buttons sit at the bottom right. Older browsers don't pass custom
// properties to ::backdrop, so the scrim token's value comes along as the fallback.
const styles = `:host { display: contents; }
dialog {
  box-sizing: border-box; inline-size: min(440px, calc(100vw - 32px)); max-inline-size: none;
  max-block-size: calc(100vh - 32px); margin: auto; padding: 0; border: 0; background: none;
  color: var(--fg); overflow: visible;
}
dialog[open] { animation: gb-overlay-in var(--fade-duration) ease-out; }
dialog::backdrop { background: var(--scrim, ${tokens.scrim}); }
dialog[open]::backdrop { animation: gb-overlay-in var(--fade-duration) ease-out; }
.box {
  display: flex; flex-direction: column; gap: 8px; max-block-size: calc(100vh - 32px); overflow: auto;
  padding: 20px; border: 1px solid var(--border); border-radius: var(--r); background: var(--raised);
  box-shadow: var(--shadow-float);
}
.box:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
h2 { margin: 0; font-size: var(--title-size); font-weight: var(--title-weight); font-stretch: var(--title-width); line-height: 1.2; }
.body { color: var(--soft); font-size: var(--body-size); line-height: 1.45; }
::slotted(p) { margin: 0; }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-block-start: 12px; }
${fadeKeyframes}
@media (prefers-reduced-motion: reduce) { dialog[open], dialog[open]::backdrop { animation: none; } }`;

/**
 * `<gb-dialog label="Delete this match?">`: a question that has to be answered before going on,
 * usually a confirmation before something destructive (brand.md, Overlays). Usually made by
 * {@link confirmDialog}.
 *
 * ```html
 * <gb-dialog label="Delete this match?">
 *   <p>Its rating changes are undone for all six players.</p>
 *   <gb-button slot="actions" value="cancel">Cancel</gb-button>
 *   <gb-button slot="actions" variant="danger" value="delete">Delete match</gb-button>
 * </gb-dialog>
 * ```
 *
 * - `label`: the heading, a question. It also names the dialog.
 * - Children with `slot="actions"` are the buttons, Cancel first. One with a `value` closes the
 *   dialog with that value.
 *
 * `show()` dims the page and opens it, with focus on the element marked `autofocus`, or else the
 * first button (Cancel). Focus stays in it until it closes. Escape and a click on the dimmed page
 * close it as `cancel`. `close(value)` closes it from code. It fires `close`, with `returnValue`
 * set, and focus goes back to where it was.
 */
export class GbDialog extends HTMLElement {
  static readonly observedAttributes = ["label"];

  readonly #root = this.attachShadow({ mode: "open" });
  readonly #dialog = document.createElement("dialog");
  readonly #heading = document.createElement("h2");
  readonly #box = document.createElement("div");
  #returnFocus: HTMLElement | null = null;
  #downOnBackdrop = false;
  /** What closed it: the `value` of the button pressed, `cancel`, or what `close()` was given. */
  returnValue = "";

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#heading.id = "heading";
    this.#dialog.setAttribute("aria-labelledby", "heading");
    this.#box.className = "box";
    this.#box.tabIndex = -1;
    const body = document.createElement("div");
    body.className = "body";
    body.append(document.createElement("slot"));
    const actions = document.createElement("div");
    actions.className = "actions";
    const actionSlot = document.createElement("slot");
    actionSlot.name = "actions";
    actions.append(actionSlot);
    this.#box.append(this.#heading, body, actions);
    this.#dialog.append(this.#box);
    this.#root.append(style, this.#dialog);
    this.#dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close("cancel");
    });
    this.#dialog.addEventListener("pointerdown", (event) => {
      this.#downOnBackdrop = event.target === this.#dialog;
    });
    this.#dialog.addEventListener("click", (event) => {
      // The box fills the dialog, so a click on the dialog itself is on the dimmed page around it.
      if (event.target === this.#dialog && this.#downOnBackdrop) this.close("cancel");
    });
    this.addEventListener("click", this.#onActionClick);
  }

  connectedCallback(): void {
    this.#heading.textContent = this.label;
  }

  disconnectedCallback(): void {
    if (this.#dialog.open) this.#dialog.close();
  }

  attributeChangedCallback(): void {
    this.#heading.textContent = this.label;
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }

  set label(value: string) {
    this.setAttribute("label", value);
  }

  get open(): boolean {
    return this.#dialog.open;
  }

  /** Dims the page and opens the dialog. */
  show(): void {
    if (this.#dialog.open || !this.isConnected) return;
    this.returnValue = "";
    this.#returnFocus = deepActive();
    this.#dialog.showModal();
    const first =
      this.querySelector<HTMLElement>("[autofocus]") ??
      this.querySelector<HTMLElement>(':scope > [slot="actions"]:not([disabled])');
    (first ?? this.#box).focus();
  }

  /** Closes it with `value` as its `returnValue`, and fires `close`. */
  close(value = "cancel"): void {
    if (!this.#dialog.open) return;
    this.returnValue = value;
    this.#dialog.close();
    this.dispatchEvent(new Event("close", { bubbles: true }));
    const back = this.#returnFocus;
    this.#returnFocus = null;
    if (back?.isConnected) back.focus();
  }

  readonly #onActionClick = (event: MouseEvent): void => {
    const action = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.parentElement === this && node.slot === "actions",
      );
    const value = action?.getAttribute("value");
    if (value !== null && value !== undefined && !event.defaultPrevented) this.close(value);
  };
}

// The focused element, inside shadow roots too, so focus goes back to the real control.
function deepActive(): HTMLElement | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : null;
}

export interface ConfirmOptions {
  /** The heading: the question ("Delete this match?"). */
  title: string;
  /** One plain line on what happens. */
  text?: string;
  /** The action's button, named by what it does ("Delete match", never "OK"). */
  action: string;
  /** Cancel's text. */
  cancel?: string;
  /** Makes the action button orange, for deletes and other destructive actions. */
  danger?: boolean;
}

/**
 * Asks before doing something and resolves to whether the user said yes:
 * `if (await confirmDialog({ title: "Delete this match?", text: "Its rating changes are undone.", action: "Delete match", danger: true })) …`.
 * The dialog leaves the page once answered.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const dialog = document.createElement("gb-dialog") as GbDialog;
  dialog.label = options.title;
  if (options.text) {
    const text = document.createElement("p");
    text.textContent = options.text;
    dialog.append(text);
  }
  const cancel = document.createElement("gb-button");
  cancel.slot = "actions";
  cancel.setAttribute("value", "cancel");
  cancel.textContent = options.cancel ?? "Cancel";
  const action = document.createElement("gb-button");
  action.slot = "actions";
  action.setAttribute("value", "confirm");
  action.setAttribute("variant", options.danger ? "danger" : "primary");
  action.textContent = options.action;
  dialog.append(cancel, action);
  document.body.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        resolve(dialog.returnValue === "confirm");
      },
      { once: true },
    );
    dialog.show();
  });
}

defineElement("gb-dialog", GbDialog);
