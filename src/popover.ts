import { defineElement } from "./define.js";
import { lightStyles } from "./light-styles.js";
import { AnchoredOverlay } from "./overlay.js";

const styles = `gb-popover { display: inline-block; vertical-align: middle; }
gb-popover[hidden] { display: none; }
gb-popover > .gb-overlay-panel { inline-size: max-content; max-inline-size: min(320px, calc(100vw - 16px)); padding: 12px; }`;

const adopt = lightStyles(styles);

/**
 * `<gb-popover>`: a small box of content or controls (filters, a share link) that a button opens
 * (brand.md, Overlays). Two children: the button, then the box.
 *
 * ```html
 * <gb-popover>
 *   <gb-button>Filters</gb-button>
 *   <div aria-label="Filters">…</div>
 * </gb-popover>
 * ```
 *
 * The button opens and closes it. It opens below the button and kept on screen, and focus moves to
 * the first control in it. Escape closes it and puts focus back on the button; a click outside or
 * focus moving away closes it too. `show()`, `hide()` and `toggle()` do the same from code, and it
 * fires `open` and `close`. Give the box a name (`aria-label`) when it has no heading.
 */
export class GbPopover extends AnchoredOverlay {
  protected override adoptStyles(root: Node): void {
    adopt(root);
  }

  protected override sync(): void {
    super.sync();
    this.panel?.setAttribute("role", "dialog");
  }
}

defineElement("gb-popover", GbPopover);
