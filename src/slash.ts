import { defineElement } from "./define.js";
import { motionAllowed } from "./motion.js";

// The brand sheet's slash: a thin line, green into a white edge, drawn left to right through the
// middle of the box at the logo cut's angle, then fading. No glow: only the God and Demigod titles
// glow. The line sits in its own clipped layer, so the host never clips its content (focus rings
// stay whole).
const styles = `:host { display: block; position: relative; border-radius: var(--r); }
:host([hidden]) { display: none; }
.cut { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
.line {
  position: absolute; inset-inline-start: -10%; inset-block-start: 50%; inline-size: 120%; block-size: 1.5px;
  background: linear-gradient(90deg, transparent, var(--green) 30%, var(--fg) 60%, transparent);
  transform: translateY(-50%) rotate(-14deg); opacity: 0;
}
.line.play { animation: slash var(--slash-duration) var(--slash-ease) forwards; }
@keyframes slash {
  0% { opacity: 1; clip-path: inset(0 100% 0 0); }
  45% { opacity: 1; clip-path: inset(0); }
  100% { opacity: 0; clip-path: inset(0); }
}
@media (prefers-reduced-motion: reduce) { .line.play { animation: none; } }`;

/**
 * `<gb-slash>…</gb-slash>`: the blade slash, brand.md's one signature move. A thin green line cuts
 * across its content once and fades, when something just changed in front of you: a rating update,
 * a rank-up, a match result.
 *
 * - It plays when a `<gb-count>` inside it starts counting, or on `play()`. Never on its own, never
 *   on page load, never on a loop.
 * - Off under reduced motion and on a page in the background.
 * - It's a block with the 6px radius, so wrap the panel or tile that changed; the line is cut to
 *   the box. Decorative only: screen readers notice nothing.
 */
export class GbSlash extends HTMLElement {
  readonly #root = this.attachShadow({ mode: "open" });
  readonly #line = document.createElement("div");

  constructor() {
    super();
    const style = document.createElement("style");
    style.textContent = styles;
    const cut = document.createElement("div");
    cut.className = "cut";
    cut.setAttribute("aria-hidden", "true");
    this.#line.className = "line";
    this.#line.setAttribute("part", "line");
    this.#line.addEventListener("animationend", () => this.#line.classList.remove("play"));
    cut.append(this.#line);
    this.#root.append(style, document.createElement("slot"), cut);
    this.addEventListener("count", () => this.play());
  }

  /** Plays the slash once, restarting it if it's still playing. */
  play(): void {
    if (!motionAllowed()) return;
    this.#line.classList.remove("play");
    // Reading the size restarts the animation when the class comes straight back.
    void this.#line.offsetWidth;
    this.#line.classList.add("play");
  }
}

defineElement("gb-slash", GbSlash);
