import { fadeKeyframes, surfaceStyles } from "./overlay.js";

// No shadow root, like the field: the input stays a native element in the page, so it submits with
// its form and autofills. The list is an overlay in the top layer where the browser has one.
export const styles = `gb-search { display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; }
gb-search[hidden] { display: none; }
.gb-search-label { font-size: 0.74rem; font-weight: 600; color: var(--soft); }
gb-search[hide-label] > .gb-search-label {
  position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
.gb-search-box { position: relative; display: grid; }
.gb-search-box > svg {
  position: absolute; inset-inline-start: 11px; inset-block-start: 50%; translate: 0 -50%;
  inline-size: 16px; block-size: 16px; color: var(--soft); pointer-events: none;
}
.gb-search-box > input {
  inline-size: 100%; min-inline-size: 0; block-size: 36px; margin: 0; padding: 0 10px 0 34px; box-sizing: border-box;
  border: 1px solid var(--control-border); border-radius: var(--r); background: var(--raised); color: var(--fg);
  font: inherit; font-size: 0.86rem; appearance: none;
}
.gb-search-box > input:dir(rtl) { padding: 0 34px 0 10px; }
gb-search[shortcut] .gb-search-box > input { padding-inline-end: 38px; }
.gb-search-box > input::-webkit-search-cancel-button { display: none; }
.gb-search-box > input::placeholder { color: var(--muted); opacity: 1; }
.gb-search-box > input:hover:not(:disabled) { border-color: var(--muted); }
.gb-search-box > input:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.gb-search-box > input:autofill { box-shadow: inset 0 0 0 100px var(--raised); -webkit-text-fill-color: var(--fg); caret-color: var(--fg); }
gb-search:has(> .gb-search-box > :disabled) { opacity: 0.5; }
.gb-search-box > :disabled { cursor: not-allowed; }
/* The key hint: only while the box is empty and not focused, and never on touch screens. */
.gb-search-box > kbd {
  position: absolute; inset-inline-end: 9px; inset-block-start: 50%; translate: 0 -50%; pointer-events: none;
  min-inline-size: 1.35rem; padding: 0 0.35rem; box-sizing: border-box; border: 1px solid var(--control-border);
  border-radius: var(--r-chip); color: var(--muted); font: inherit; font-size: 0.72rem; line-height: 1.3rem; text-align: center;
}
gb-search:focus-within .gb-search-box > kbd, gb-search[data-filled] .gb-search-box > kbd, gb-search:has(> .gb-search-box > :disabled) .gb-search-box > kbd { display: none; }

.gb-search-popup {
  ${surfaceStyles} z-index: 1000; max-inline-size: calc(100vw - 16px); max-block-size: min(60vh, 24rem); overflow: auto; padding: 4px;
}
.gb-search-popup[hidden] { display: none; }
.gb-search-popup[aria-busy="true"] > ul { opacity: 0.6; }
.gb-search-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.gb-search-list > :is(a, div) {
  display: flex; align-items: center; gap: 8px; flex: none; block-size: 36px; padding: 0 10px; box-sizing: border-box;
  border-radius: calc(var(--r) - 2px); color: var(--soft); font-size: 0.84rem; text-decoration: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.gb-search-list > :is(a, div):hover { background: var(--line); }
.gb-search-list > [data-active] { background: var(--line); outline: 2px solid var(--green); outline-offset: -2px; }
.gb-search-name { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gb-search-name > b { color: var(--fg); font-weight: 650; }
.gb-search-name > small { margin-inline-start: 8px; color: var(--muted); font-size: 0.72rem; }
.gb-search-detail { flex: none; color: var(--soft); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.gb-search-note { margin: 0; padding: 8px 10px; color: var(--muted); font-size: 0.84rem; }
.gb-search-note:empty { display: none; }
.gb-search-note[data-error] { color: var(--down); }
.gb-search-live { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
${fadeKeyframes}
@media (pointer: coarse) {
  .gb-search-box > input { block-size: 40px; }
  .gb-search-box > kbd { display: none; }
  .gb-search-list > :is(a, div) { block-size: 44px; }
}
@media (prefers-reduced-motion: reduce) { .gb-search-popup { animation: none; } }`;
