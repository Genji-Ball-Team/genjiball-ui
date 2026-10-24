import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { follow, lower, raise, surfaceStyles } from "./overlay.js";

/** How long the pointer rests on a control before its tooltip shows. */
export const showDelayMs = 400;
// Time to cross the gap from the control to the tooltip without it closing.
const hideDelayMs = 120;
// Right after one tooltip closes, the next shows without waiting, so scanning a toolbar is quick.
const warmMs = 300;

const styles = `gb-tooltip { display: inline-block; vertical-align: middle; }
gb-tooltip[hidden] { display: none; }
.gb-tooltip-tip {
  ${surfaceStyles} z-index: 1001; max-inline-size: min(260px, calc(100vw - 16px)); padding: 5px 9px;
  font-size: 0.75rem; line-height: 1.35; overflow-wrap: anywhere;
}
.gb-tooltip-tip[hidden] { display: none; }
@media (prefers-reduced-motion: reduce) { .gb-tooltip-tip { animation: none; } }`;

const adopt = lightStyles(styles);

let nextId = 0;
let lastClosed = 0;

/**
 * `<gb-tooltip text="Copies the code with rank tags">`: a few words on the control it wraps
 * (brand.md, Overlays). Never anything to click, and never the only place something is said: touch
 * screens don't show it.
 *
 * ```html
 * <gb-tooltip text="Copy the ranked code"><gb-button variant="ghost" aria-label="Copy">…</gb-button></gb-tooltip>
 * ```
 *
 * It shows after ~400ms of hover and straight away on keyboard focus, centred below the control (or
 * above when there's no room), and the pointer can move onto it. Escape, a click, or leaving the
 * control hides it. Screen readers hear the text as the control's description, unless it's the same
 * as the control's name. An icon-only button still needs its own label.
 */
export class GbTooltip extends HTMLElement {
  static readonly observedAttributes = ["text"];

  readonly #tip = document.createElement("span");
  #showTimer: ReturnType<typeof setTimeout> | undefined;
  #hideTimer: ReturnType<typeof setTimeout> | undefined;
  #stop: (() => void) | undefined;

  constructor() {
    super();
    this.#tip.className = "gb-tooltip-tip";
    this.#tip.id = `gb-tooltip-${nextId++}`;
    this.#tip.setAttribute("role", "tooltip");
    this.#tip.hidden = true;
    this.addEventListener("pointerenter", this.#onPointerEnter);
    this.addEventListener("pointerleave", this.#onPointerLeave);
    this.addEventListener("pointerdown", () => this.hide());
    this.addEventListener("focusin", this.#onFocusIn);
    this.addEventListener("focusout", () => this.hide());
  }

  connectedCallback(): void {
    adopt(this.getRootNode());
    if (this.#tip.parentNode !== this) this.append(this.#tip);
    this.#sync();
  }

  disconnectedCallback(): void {
    this.hide();
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  get text(): string {
    return this.getAttribute("text") ?? "";
  }

  set text(value: string) {
    this.setAttribute("text", value);
  }

  /** The control it's for: the first child. */
  get trigger(): HTMLElement | null {
    const first = this.firstElementChild;
    return first instanceof HTMLElement && first !== this.#tip ? first : null;
  }

  get open(): boolean {
    return !this.#tip.hidden;
  }

  show(): void {
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    const trigger = this.trigger;
    if (this.open || !trigger || !this.text || !this.isConnected) return;
    raise(this.#tip);
    this.#stop = follow(this.#tip, trigger, { align: "center" });
    document.addEventListener("keydown", this.#onEscape, true);
  }

  hide(): void {
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    if (!this.open) return;
    this.#stop?.();
    this.#stop = undefined;
    lower(this.#tip);
    lastClosed = Date.now();
    document.removeEventListener("keydown", this.#onEscape, true);
  }

  #sync(): void {
    this.#tip.textContent = this.text;
    if (!this.text) this.hide();
    const trigger = this.trigger;
    if (!trigger) return;
    // A <gb-button> keeps its real button in a shadow root, which an id can't reach, so it gets the
    // text itself and passes it on.
    const name = (trigger.getAttribute("aria-label") ?? trigger.textContent).trim();
    const describe = this.text && this.text !== name;
    if (trigger.shadowRoot) {
      if (describe) trigger.setAttribute("aria-description", this.text);
      else trigger.removeAttribute("aria-description");
    } else if (describe) trigger.setAttribute("aria-describedby", this.#tip.id);
    else trigger.removeAttribute("aria-describedby");
  }

  readonly #onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === "touch") return;
    clearTimeout(this.#hideTimer);
    if (this.open) return;
    const warm = Date.now() - lastClosed < warmMs;
    clearTimeout(this.#showTimer);
    this.#showTimer = setTimeout(() => this.show(), warm ? 0 : showDelayMs);
  };

  readonly #onPointerLeave = (): void => {
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    this.#hideTimer = setTimeout(() => this.hide(), hideDelayMs);
  };

  readonly #onFocusIn = (event: FocusEvent): void => {
    if (event.target instanceof Element && this.#tip.contains(event.target)) return;
    // Keyboard focus only: a click focuses the control too, and shouldn't pop the tooltip up.
    if (focusVisible(this.trigger)) this.show();
  };

  readonly #onEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    // Escape closes the tooltip only, not a menu or dialog it's in.
    event.preventDefault();
    event.stopPropagation();
    this.hide();
  };
}

function focusVisible(trigger: HTMLElement | null): boolean {
  if (!trigger) return false;
  const focused = trigger.shadowRoot?.activeElement ?? trigger;
  try {
    return focused.matches(":focus-visible");
  } catch {
    return true;
  }
}

defineElement("gb-tooltip", GbTooltip);
