import { defineElement } from "./define.js";

// Hidden until the app turns avatars on with `--gb-avatar-display` (brand.md, Players): there are no
// pictures before Discord linking, and no generated ones. The picture, or the grey initial when
// there's none or it fails to load, fills a square with the one brand radius.
const styles = `:host {
  --gb-avatar-size: 32px;
  display: var(--gb-avatar-display, none); flex: none; vertical-align: middle; overflow: hidden;
  inline-size: var(--gb-avatar-size); block-size: var(--gb-avatar-size); border-radius: var(--r); background: var(--border);
}
:host([hidden]) { display: none; }
img, .initial { inline-size: 100%; block-size: 100%; }
img { display: block; object-fit: cover; }
.initial {
  display: grid; place-items: center; color: var(--soft); font-size: calc(var(--gb-avatar-size) * 0.45);
  font-weight: 700; font-stretch: var(--heading-width); line-height: 1; user-select: none;
}`;

/** The first character of a name as a person sees it (an emoji or accented letter stays whole). */
export function initial(name: string): string {
  const trimmed = name.trim();
  const [first] = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed);
  return (first?.segment ?? "").toLocaleUpperCase();
}

/**
 * `<gb-avatar name="Kyoryu" src="https://cdn.discordapp.com/…">`: a player's picture, or the grey
 * first letter of their `name` when there's no `src` or it doesn't load.
 *
 * Hidden by default: players have no pictures until they can link Discord. Turn avatars on for the
 * whole app with `--gb-avatar-display: inline-block` on `:root`.
 *
 * - `size`: the side in pixels, 32 by default (or `--gb-avatar-size` in CSS).
 * - It's decorative and hidden from screen readers, since the name is always next to it.
 */
export class GbAvatar extends HTMLElement {
  static readonly observedAttributes = ["name", "src", "size"];

  readonly #root = this.attachShadow({ mode: "open" });
  // The src that failed to load, so the initial shows until there's another one.
  #failed: string | undefined;

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    this.#root.append(style);
  }

  connectedCallback(): void {
    this.setAttribute("aria-hidden", "true");
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  #render(): void {
    const size = Number(this.getAttribute("size"));
    if (size > 0) this.style.setProperty("--gb-avatar-size", `${size}px`);
    else this.style.removeProperty("--gb-avatar-size");

    const src = this.getAttribute("src") ?? "";
    let content: HTMLElement;
    if (src && src !== this.#failed) {
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => {
        this.#failed = src;
        this.#render();
      });
      img.src = src;
      content = img;
    } else {
      content = document.createElement("span");
      content.className = "initial";
      content.textContent = initial(this.getAttribute("name") ?? "");
    }
    this.#root.querySelector("img, .initial")?.remove();
    this.#root.append(content);
  }
}

defineElement("gb-avatar", GbAvatar);
