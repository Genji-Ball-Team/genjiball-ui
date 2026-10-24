import { lightStyles } from "./light-styles.js";

/** A box on screen, in viewport pixels: what `getBoundingClientRect()` gives. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Placement {
  x: number;
  y: number;
  /** Which side of the anchor the overlay ended up on. */
  side: "bottom" | "top";
}

export interface PlaceOptions {
  /** `start` lines the overlay up with the anchor's start edge, `center` centres it on the anchor. */
  align?: "start" | "center";
  /** Right to left: the start edge is the right one. */
  rtl?: boolean;
  /** Space between the anchor and the overlay. */
  gap?: number;
}

/** Overlays stay this far inside the window. */
export const margin = 8;

/**
 * Where an overlay of `size` goes next to `anchor` in a `view`-sized window (brand.md, Overlays):
 * below it, or above when only that fits, lined up with its start edge, or its end edge when only
 * that fits, and always `margin` inside the window.
 */
export function place(
  anchor: Box,
  size: { width: number; height: number },
  view: { width: number; height: number },
  { align = "start", rtl = false, gap = 6 }: PlaceOptions = {},
): Placement {
  const below = anchor.top + anchor.height + gap;
  const above = anchor.top - gap - size.height;
  const fitsBelow = below + size.height <= view.height - margin;
  const fitsAbove = above >= margin;
  // When neither fits, the side with more room.
  const roomBelow = view.height - (anchor.top + anchor.height);
  const side = fitsBelow || (!fitsAbove && roomBelow >= anchor.top) ? "bottom" : "top";
  let x: number;
  if (align === "center") x = anchor.left + (anchor.width - size.width) / 2;
  else {
    const left = anchor.left;
    const right = anchor.left + anchor.width - size.width;
    // The start edge, or the end edge when that's the only one that fits.
    const fits = (value: number) => value >= margin && value + size.width <= view.width - margin;
    const [first, second] = rtl ? [right, left] : [left, right];
    x = !fits(first) && fits(second) ? second : first;
  }
  return {
    x: clamp(x, margin, view.width - margin - size.width),
    y: clamp(side === "bottom" ? below : above, margin, view.height - margin - size.height),
    side,
  };
}

// Too big for the window: keep the start edge in view.
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Keeps `overlay` (a `position: fixed` element) placed next to `anchor` while the page scrolls or
 * resizes, or the overlay changes size. Returns the function that stops it.
 */
export function follow(
  overlay: HTMLElement,
  anchor: Element,
  options: PlaceOptions = {},
): () => void {
  const update = () => {
    const spot = place(
      anchor.getBoundingClientRect(),
      overlay.getBoundingClientRect(),
      { width: document.documentElement.clientWidth || innerWidth, height: innerHeight },
      { ...options, rtl: getComputedStyle(anchor).direction === "rtl" },
    );
    overlay.style.left = `${Math.round(spot.x)}px`;
    overlay.style.top = `${Math.round(spot.y)}px`;
    overlay.dataset.side = spot.side;
  };
  update();
  // Capture, so scrolling any box the anchor sits in moves the overlay too.
  addEventListener("scroll", update, { capture: true, passive: true });
  addEventListener("resize", update);
  const resized = typeof ResizeObserver === "function" ? new ResizeObserver(update) : undefined;
  resized?.observe(overlay);
  return () => {
    removeEventListener("scroll", update, { capture: true });
    removeEventListener("resize", update);
    resized?.disconnect();
  };
}

/**
 * Shows an overlay on top of everything: in the top layer where the browser has the popover API
 * (so no `overflow` or `z-index` of a parent can cut it off, and it shows above an open dialog),
 * otherwise as a fixed element over the page.
 */
export function raise(overlay: HTMLElement): void {
  overlay.hidden = false;
  if (!("showPopover" in overlay)) return;
  overlay.popover = "manual";
  if (!overlay.matches(":popover-open")) overlay.showPopover();
}

/** Takes an overlay shown by {@link raise} away again. */
export function lower(overlay: HTMLElement): void {
  if ("hidePopover" in overlay && overlay.popover && overlay.matches(":popover-open"))
    overlay.hidePopover();
  overlay.hidden = true;
}

/**
 * The look every overlay shares (brand.md, Overlays): `raised`, a 1px border, the floating shadow
 * and a quick fade in. The popover attribute's own browser styles (centred, a margin, a canvas
 * background) are reset so `follow` can place it.
 */
export const surfaceStyles = `position: fixed; inset: auto; margin: 0; box-sizing: border-box;
  border: 1px solid var(--border); border-radius: var(--r); background: var(--raised);
  box-shadow: var(--shadow-float); color: var(--fg); animation: gb-overlay-in var(--fade-duration) ease-out;`;

export const fadeKeyframes = `@keyframes gb-overlay-in { from { opacity: 0; } }`;

const panelStyles = `.gb-overlay-panel { ${surfaceStyles} z-index: 1000; max-inline-size: calc(100vw - ${2 * margin}px); max-block-size: calc(100vh - ${2 * margin}px); overflow: auto; }
.gb-overlay-panel[hidden] { display: none; }
${fadeKeyframes}
@media (prefers-reduced-motion: reduce) { .gb-overlay-panel { animation: none; } }`;

const adoptPanelStyles = lightStyles(panelStyles);

let nextId = 0;

/**
 * What `<gb-popover>` and `<gb-menu>` share. The element holds two children: the button that opens
 * it, then the panel. The panel opens below the button, and closes on Escape (focus goes back to the
 * button), a click outside, or focus moving away.
 */
export class AnchoredOverlay extends HTMLElement {
  protected readonly overlayId = `gb-overlay-${nextId++}`;
  /** What the button's `aria-haspopup` says the panel is. */
  protected readonly popupRole: "dialog" | "menu" = "dialog";
  #open = false;
  #stop: (() => void) | undefined;
  #observer: MutationObserver | undefined;

  constructor() {
    super();
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("focusout", this.#onFocusOut);
  }

  connectedCallback(): void {
    adoptPanelStyles(this.getRootNode());
    this.adoptStyles(this.getRootNode());
    this.sync();
    // The children can arrive after the element is defined, while the page is parsed.
    this.#observer ??= new MutationObserver(() => {
      this.sync();
    });
    this.#observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.hide(false);
  }

  /** The button that opens it: the first child. */
  get trigger(): HTMLElement | null {
    const first = this.firstElementChild;
    return first instanceof HTMLElement && first !== this.lastElementChild ? first : null;
  }

  /** What opens: the last child. */
  get panel(): HTMLElement | null {
    const last = this.lastElementChild;
    return last instanceof HTMLElement && last !== this.firstElementChild ? last : null;
  }

  get open(): boolean {
    return this.#open;
  }

  /** Opens the panel and fires `open`. */
  show(): void {
    const { trigger, panel } = this;
    if (this.#open || !trigger || !panel) return;
    this.#open = true;
    this.sync();
    raise(panel);
    this.#stop = follow(panel, trigger);
    document.addEventListener("pointerdown", this.#onOutside, true);
    this.dispatchEvent(new Event("open", { bubbles: true }));
    this.focusPanel(panel);
  }

  /** Closes the panel and fires `close`. With `returnFocus`, the button gets focus back. */
  hide(returnFocus = true): void {
    if (!this.#open) return;
    this.#open = false;
    this.#stop?.();
    this.#stop = undefined;
    document.removeEventListener("pointerdown", this.#onOutside, true);
    const { panel, trigger } = this;
    if (panel) lower(panel);
    this.sync();
    if (returnFocus) trigger?.focus();
    this.dispatchEvent(new Event("close", { bubbles: true }));
  }

  toggle(): void {
    if (this.#open) this.hide();
    else this.show();
  }

  /** Adds the subclass's own styles to the page; called once per root. */
  protected adoptStyles(root: Node): void {
    void root;
  }

  /** Puts focus in the panel once it's open. */
  protected focusPanel(panel: HTMLElement): void {
    const first = panel.querySelector<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]), gb-button:not([disabled])',
    );
    (first ?? panel).focus();
  }

  /** Sets the roles, names and state on the button and panel. */
  protected sync(): void {
    this.#observer?.takeRecords();
    const { trigger, panel } = this;
    if (!trigger || !panel) return;
    panel.id ||= `${this.overlayId}-panel`;
    panel.classList.add("gb-overlay-panel");
    if (panel.tabIndex < 0 && !panel.hasAttribute("tabindex")) panel.tabIndex = -1;
    if (!this.#open) panel.hidden = true;
    trigger.setAttribute("aria-haspopup", this.popupRole);
    trigger.setAttribute("aria-expanded", String(this.#open));
    // An id only reaches an element in the same root, so a <gb-button> goes without.
    if (trigger.shadowRoot) trigger.removeAttribute("aria-controls");
    else trigger.setAttribute("aria-controls", panel.id);
  }

  /** Clicks inside the panel, for a subclass to act on. */
  protected panelClick(event: MouseEvent): void {
    void event;
  }

  /** Keys pressed inside the panel; returns true when it used the key. */
  protected panelKeydown(event: KeyboardEvent): boolean {
    void event;
    return false;
  }

  readonly #onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Node ? event.target : null;
    if (target && this.trigger?.contains(target)) this.toggle();
    else if (target && this.panel?.contains(target)) this.panelClick(event);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !this.#open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      // Escape stops here, so a dialog the overlay is in stays open.
      event.stopPropagation();
      this.hide();
    } else if (this.panelKeydown(event)) event.preventDefault();
  };

  readonly #onFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Node && !this.contains(to)) this.hide(false);
  };

  readonly #onOutside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) this.hide(false);
  };
}
