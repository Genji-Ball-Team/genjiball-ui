# Genji Ball brand rules (draft)

## The library

- A fully fledged UI library from the start: tokens, CSS, icons and framework-free web components (`<gb-…>`) with their behaviour built in.
- Must work in the website (genjiball-ranked) and the host tool (Tauri), both plain TypeScript with no framework.
- Own repo `genjiball-ui` (fifth repo, same workspace rules), published as a versioned public package on npmjs.com under `@genji-ball-team` (no install token needed); apps upgrade deliberately.
- Comes with a docs/gallery site showing every component and state (e.g. ui.genjiball.us).

## Direction

- Esports broadcast + a Genji touch, with the minimalism of the current site.
- Rule zero: restraint. Drama only in a few moments (rank-ups, results, hero); everything else flat and quiet.

## Colour

- Dark first. Only dark ships now, but tokens are named by role (`surface`, `text-muted`, `accent`), never by colour, and components never hard-code colours, so a light theme can be added later.
- Every colour is defined in OKLCH.
- Brand green: `oklch(79% 0.132 158)` (was #67d49a).
- No region colours. Region is text only, never colour.
- Neutrals: hue 210 (teal-blue), low chroma.

| Token          | Value                    |
| -------------- | ------------------------ |
| bg             | `oklch(15% 0.007 210)`   |
| panel          | `oklch(17.7% 0.008 210)` |
| raised         | `oklch(21.4% 0.010 210)` |
| line           | `oklch(24% 0.011 210)`   |
| border         | `oklch(28% 0.012 210)`   |
| control-border | `oklch(52% 0.012 210)`   |
| muted          | `oklch(63% 0.012 210)`   |
| soft           | `oklch(80% 0.008 210)`   |
| fg             | `oklch(96% 0.005 210)`   |

- Brand green means only "Genji Ball / interactive": logo, primary buttons, links, active tab, focus.
- Gains and losses never use brand colours, and never colour alone (always ▲▼ or a WIN/LOSS label too).

| Token | Value                 | Use                  |
| ----- | --------------------- | -------------------- |
| up    | `oklch(80% 0.11 230)` | gain, win, rating up |
| down  | `oklch(73% 0.16 48)`  | loss, rating down    |

- Warnings use `down` (orange) or a neutral style with an icon, never gold.
- Gold `oklch(86.6% 0.126 90)` = earned prestige only: records, tourney winners, top marks. Never on buttons, warnings or ordinary UI.
- Titles have their own themes, outside the gold rule, and are the one place for motion and glow on a leaderboard:
  - **God = white light.** White rim running round the row, glowing white place and rating, shimmering name, cream-white chip.
  - **Demigod = dark red.** Slower red rim turning the other way, red tier bar and haze, deep red chip.

| Token     | Value                   |
| --------- | ----------------------- |
| god       | `oklch(100% 0 0)`       |
| god-cream | `oklch(97% 0.04 93)`    |
| god-rim   | `oklch(93.7% 0.086 92)` |
| demi      | `oklch(48.6% 0.185 28)` |
| demi-hi   | `oklch(62.6% 0.182 32)` |
| demi-deep | `oklch(36.4% 0.149 29)` |
| demi-dark | `oklch(24% 0.026 11)`   |

### Rank tiers

- Tuned in OKLCH: same colour families as before, but brightness evened out so every tier reads on the dark background (the top tiers used to be the darkest).
- Applies everywhere: site, host tool, bot, and the in-game rank tags. Changing the game means updating `genjiball-ranked/src/config.ts` and GenjiBall-CE v1.3.3R `src/features/rank-tags.opy` together, then re-releasing 1.3.3R.
- Tier colour shows only on the tier chip and the row's side bar, never on text or numbers. That keeps it apart from gold, up and down.

| Tier        | Token value           | RGB (game / config) | Was           |
| ----------- | --------------------- | ------------------- | ------------- |
| Rookie      | `oklch(82% 0.07 185)` | [143,211,202]       | [126,224,200] |
| Apprentice  | `oklch(68% 0.11 50)`  | [207,131,88]        | [205,127,50]  |
| Master      | `oklch(86% 0.15 100)` | [232,211,79]        | [255,215,0]   |
| Grandmaster | `oklch(76% 0.16 70)`  | [240,156,23]        | [255,140,0]   |
| Ascendant   | `oklch(70% 0.15 265)` | [112,154,251]       | [60,160,255]  |
| Champion    | `oklch(68% 0.2 22)`   | [251,87,93]         | [150,0,0]     |
| Sovereign   | `oklch(69% 0.19 305)` | [183,119,248]       | [90,20,140]   |

## Type

- One font: **Saira** (variable, self-hosted), for everything including the logo.
- Width axis does the work: condensed (~72–80%) for labels, headings and big numbers; normal width for body text.
- Labels: small, uppercase, condensed, wide tracking (~.16em), muted.
- Numbers: always tabular.

## Genji touch

- Logo: keep the current mark, a green ball sliced by one diagonal blade cut (`favicon.svg`).
- Motion: one signature move, the **blade slash**: a thin green line cutting diagonally across the element (same angle idea as the logo cut), ~0.55s, then fading.
  - Plays once, only when something just changed in front of you (rating update, rank-up, match result). Never loops, never on page load. Off under reduced motion.
  - Goes with: the number counting up (~0.6s, ease-out) and the delta fading in.
  - The light sweep belongs to the God title only, so titles stay special.
  - Everything else barely moves.
- Icons: a custom set, high quality, never generic or "AI slop".
  - Style: duotone. 1.75px rounded outline on a 24px grid, plus a soft fill (currentColor at ~20%). Checked at 16, 20 and 24px.
  - Theming comes from the subjects, not from a filter. No mechanical cut or effect applied to every icon (tried: reads as damage).
  - Chosen subjects: player = Genji faceplate (V visor, pointed chin); matches = the logo's sliced ball; records = medal with a "1"; deflects = katana + slash arc; live = ball with speed lines; leaderboard = podium.
  - Avoid: the 4-point "AI sparkle" star, generic person silhouettes, Western sword shapes.
  - The dash-afterimage (offset fill) is motion only (hover/active), never static.
- No kanji or Japanese text as decoration.

## Voice

- Plain and short by default ("You reached Diamond." / "No matches yet.").
- A little game slang where it describes gameplay: deflected, beamed (ball straight in someone's face), edashed (deflect + dash). Keep the list simple; no extra terms.
- Slang goes in: stat names, match timelines, records, highlights, rank-ups, bot posts.
- Slang stays out of: errors, forms, settings, uploads, anything a frustrated host reads. Errors say what happened and what to do.
- Subtext is the exception: a small muted caption only where it adds something the UI can't show (a timestamp, a source, a real warning). Never one on every card or panel by default; if a caption is just explaining the UI, fix the label or layout instead.

## Density

- Goal: low cognitive load. Never more on screen than a player needs to process.
- One spacing scale on a 4px base, two densities: compact for tables, lists and leaderboards; comfortable for page layout, cards, hero areas and forms.
- On phones, tables step up to comfortable; tap targets at least 40px tall.

## Accessibility

- Target: WCAG 2.1 AA everywhere.
- Text contrast at least 4.5:1 (3:1 for large text and UI outlines). Checked: muted is the weakest text at 5.0:1 on raised; tier chips go down to 4.6:1 (Champion and Sovereign were lightened to get there). `line` and `border` are decorative separators and need no ratio; an edge that shows where a control is uses `control-border`.
- Visible focus ring (brand green) on everything focusable; every component works by keyboard.
- Icons and charts carry screen-reader labels; icon-only buttons need a label.
- Reduced motion: slash, count-up, title effects and sweeps switch off.
- The library tests this: a token-pair contrast test fails the build below AA.

## Charts

- Rating line: one colour for the whole line, from the net change over the shown range: `up` (blue) if up, `down` (orange) if down. Matches the ▲/▼ delta in the header. Never per-match stripes.
- Tier thresholds: dashed line in the tier colour with its small tier chip; reaching a rank = crossing a line. No tier-coloured bands.
- Clickable: each point opens that match. Hover (or first tap on phones): pointer cursor, green crosshair and dot, tooltip with match, place, rating, delta and a green "Open match →".
- Other charts: neutral marks; colour only where it means something (up/down, tier chips, gold for records). Recessive grid and axes, 2px lines, tabular numbers, one axis only, screen-reader label on every chart.

## Buttons

- Primary: solid brand green, dark text. At most one per screen: the obvious next step.
- Secondary: grey (raised fill, 1px border), normal text.
- Ghost: text only, for small actions ("Show more", "Copy").
- Danger: orange (`down`) outline, for deletes and destructive admin/host-tool actions; always confirmed.
- All rounded 6px, at least 40px tall on phones, green focus ring.

## Feedback

- Inline for anything tied to one control: "Copied ✓" in place of the button text, form errors under their field.
- Toasts for background events (upload finished, match came in, sync failed): bottom-right on desktop, bottom-centre on phones, floating shadow.
- Successes auto-dismiss after ~4s; errors stay until closed, say what happened and what to do, and offer a fix button when there is one ("Retry").
- Always an icon (✓ / ⚠) plus text, never colour alone. Error and warning use `down`; success uses `up`.

## Players

- Name only for now: name, tier chip, title if any. No generated or fake avatars.
- Later (not now): players may link Discord. Their Discord picture then shows on their profile, probably not on the leaderboard.
- The library still ships an avatar component from the start: picture if there is one, grey initial if not, hidden by default.

## Loading

- Skeletons: placeholder shapes (`raised` on `panel`) in the real layout, so nothing jumps when data arrives. Slow, faint pulse; static under reduced motion.
- Only after ~300ms, so fast loads never flash grey.
- Short actions (a button submitting): small inline spinner in the button, button keeps its width.

## Shape

- Rounded everywhere, one consistent radius (6px; small chips 4px). No chamfers, slashes or clip-path shapes.

## Depth

- Flat at rest: page panels and cards are separated by background step (bg → panel → raised) and a 1px `line`/`border`, never a shadow.
- Shadow means "on top and temporary": only menus, tooltips, popovers, dialogs and toasts get one soft dark shadow (one token, `shadow-float`).
- Dialogs also dim the page behind them.

## Inputs

- `raised` fill, 1px `control-border` (3:1 against the surface, so the field can be seen), label above (never placeholder-only), green focus ring.
- Errors go below the field in `down` with ⚠ and say how to fix it.

## Empty states

- One `muted` line saying what's missing, plus an optional action ("No matches yet." / "Host a ranked lobby").

## Package

- `@genji-ball-team/ui` on npm, public. Web components prefixed `gb-`, CSS tokens as custom properties.
