# Genji Ball UI

The UI library for everything Genji Ball: design tokens, CSS, icons and framework-free web components (`<gb-…>`), published as `@genji-ball-team/ui` on npm.

It's built for the [ranked website](https://github.com/Genji-Ball-Team/genjiball-ranked) (genjiball.us) and the [host tool](https://github.com/Genji-Ball-Team/genjiball-host-tool), which are both plain TypeScript with no framework, so the components carry their own behaviour.

- **Brand rules:** [docs/brand.md](docs/brand.md). Every colour, type, icon, motion and component decision, with the reasons.
- **Brand sheet:** [docs/brand-sheet.html](docs/brand-sheet.html). All of the rules on one page; open it in a browser.
- **Discord:** [discord.gg/sv9VVjh5pT](https://discord.gg/sv9VVjh5pT)

## Status

Brand decided, package set up, components in progress. The plan is in the [milestones](https://github.com/Genji-Ball-Team/genjiball-ui/milestones):

1. **Brand:** review the brand sheet and run a second brainstorm for what's still open.
2. **v0.1 Foundations:** package, tokens, base CSS, Saira, icons, contrast test, npm publishing.
3. **v0.2 Components:** buttons, inputs, chips, leaderboard rows, chart, toasts, dialogs and the rest.
4. **Gallery:** a site showing every component and state.
5. **Adoption:** the website and host tool switch to the library.

## Using it

```ts
import "@genji-ball-team/ui/base.css"; // the tokens, Saira, a reset and the page defaults: include it first
import { tokens } from "@genji-ball-team/ui/tokens.js"; // the same values for code: tokens.up, tokens["t-master"]
```

`base.css` loads Saira from the package (`fonts/`, no Google Fonts request), sets the dark page, headings and links, gives every focusable element the green focus ring, uses tabular numbers in tables and on `.gb-num`, and turns animation off under `prefers-reduced-motion`. It also has `.gb-display` for big numbers and `.gb-label` for small uppercase labels. To get only the custom properties, import `@genji-ball-team/ui/tokens.css` instead.

### Icons

```ts
import "@genji-ball-team/ui/icon.js"; // registers <gb-icon>
import { iconSvg } from "@genji-ball-team/ui/icons.js"; // the same icons as <svg> strings, for server-rendered HTML
```

```html
<gb-icon name="leaderboard"></gb-icon> Leaderboard
<button><gb-icon name="records" label="Records"></gb-icon></button>
```

The set: `player`, `matches`, `records`, `deflects`, `live`, `leaderboard`. They're drawn in `currentColor`, so they take the text colour. `<gb-icon>` is 1.25em by default; set `inline-size` and `block-size` to change that. Leave `label` off when text next to the icon already says the same (the icon is then hidden from screen readers), and always give one to an icon-only button. The SVG files are in the package too, as `dist/icons/<name>.svg`.

### Buttons

```ts
import "@genji-ball-team/ui/button.js"; // registers <gb-button>
```

```html
<gb-button variant="primary" type="submit">Save</gb-button>
<gb-button variant="ghost"><gb-icon name="records"></gb-icon> Show more</gb-button>
```

- `variant`: `primary` (solid green, at most one per screen: the obvious next step), `secondary` (the default), `ghost` (text only, for small actions like "Copy") or `danger` (orange outline, for deletes; always ask for confirmation first, the button doesn't).
- `type`: `button` (the default, unlike a native button), `submit` or `reset`, acting on the form the button is in. Enter in a text field submits through the form's first submit `<gb-button>`, as with a native one, unless it's busy or disabled.
- `disabled` greys it out and takes it out of the tab order. `busy` shows a spinner at the same width and ignores clicks, but keeps focus, so set it while a submit runs.
- `button.flash("Copied ✓")` shows a short message in place of the label for two seconds; screen readers hear it.

It's 36px tall, 40px on touch screens.

### Inputs

```ts
import "@genji-ball-team/ui/field.js"; // registers <gb-field>
```

```html
<gb-field label="BattleTag"><input name="battletag" required /></gb-field>
<gb-field label="Region">
  <select name="region">
    <option>EU</option>
    <option>NA</option>
  </select>
</gb-field>
<gb-field label="Upload automatically"><input type="checkbox" name="auto" /></gb-field>
<gb-field label="Start with Windows"><input type="checkbox" role="switch" /></gb-field>
```

`<gb-field>` wraps one native `<input>`, `<select>` or `<textarea>` and gives it the brand look: raised fill, a visible edge, the label above (beside a checkbox or switch) as a real `<label>`, and the error below. The control stays the page's own element, so it submits with the form, autofills and takes `name`, `value`, `required` and the rest as usual. `role="switch"` on a checkbox makes it a toggle.

- `label` is required: never a placeholder on its own.
- `error`: what's wrong and how to fix it ("This token isn't valid. Copy it again from the site."). It shows under the field in orange with ⚠, and the control gets `aria-invalid` and is described by it. Set `field.error = ""` once it's fixed. After a failed submit, focus the first field with an error.
- Disable the control itself (`input.disabled = true`); the field greys out with it.

Fields are 36px tall, 40px on touch screens. The field has no shadow root; its styles are added to the page (or the shadow root it's in) once.

### Chips

```ts
import "@genji-ball-team/ui/chip.js"; // registers <gb-chip>
import { tiers } from "@genji-ball-team/ui/chip.js"; // "rookie" … "sovereign", lowest first
```

```html
Kyoryu <gb-chip title-chip="god">God</gb-chip> <gb-chip tier="sovereign">Sovereign</gb-chip>
<gb-chip>EU</gb-chip>
```

- `tier`: a tier chip, in that tier's colour. Tier colour goes only here and on a row's side bar, never on text.
- `title-chip`: `god` (white, glowing) or `demigod` (deep red). A light band sweeps across them; it stops under reduced motion. They're the only chips that move.
- Neither: a grey chip, for a region. Regions have no colours.

The text is the chip's content, so it shows before the script loads; it's drawn uppercase.

### Toasts

```ts
import { toast } from "@genji-ball-team/ui/toast.js"; // registers <gb-toast> and <gb-toast-region>

toast("Match uploaded");
toast("Upload failed. Your log is kept.", {
  kind: "error",
  action: { label: "Retry", run: retryUpload },
});
```

For things that happen in the background. Anything tied to one control gets inline feedback instead: `button.flash("Copied ✓")` or a field's `error`.

- `kind`: `success` (the default, ✓ in blue) goes away after about 4s, waiting while the pointer or focus is on it. `error` (⚠ in orange) stays until closed. Errors say what happened and what to do.
- `action`: a button that fixes it. Pressing it runs `run` and closes the toast.
- Every toast has a close button, and Escape closes the one with focus. `toast()` returns the `<gb-toast>`: `close()` takes it away early, and it fires `close` when it goes.

Toasts stack in a `<gb-toast-region>` at the bottom right of the page, bottom centre on phones. Screen readers hear each one: errors straight away, successes once the screen reader finishes what it's saying. `toast()` adds the region on first use; put `<gb-toast-region></gb-toast-region>` in the page's markup to have it ready from the start.

### Skeletons

```ts
import "@genji-ball-team/ui/skeleton.js"; // registers <gb-skeleton>
```

```html
<section aria-busy="true" aria-label="Leaderboard">
  <gb-skeleton block class="row">
    <gb-skeleton style="inline-size: 38%"></gb-skeleton>
    <gb-skeleton style="inline-size: 16%; margin-inline-start: auto"></gb-skeleton>
  </gb-skeleton>
</section>
```

Placeholders in the shape of the content that's loading, so nothing jumps when it arrives. A `<gb-skeleton>` is a line of text: give it a width. With `block` it's a row or box that holds lines; lay it out like the real row. They show only after 300ms, so a fast load never flashes grey, and lines pulse slowly (still under reduced motion).

Skeletons are hidden from screen readers: mark the loading area `aria-busy="true"` and give it a name. Lines are `raised`, for a `panel`; on a `raised` surface, set `--gb-skeleton-fill: var(--border)` on it.

### Panels, stats and empty states

```ts
import "@genji-ball-team/ui/panel.js"; // registers <gb-panel>
import "@genji-ball-team/ui/stat.js"; // registers <gb-stat>
import "@genji-ball-team/ui/empty.js"; // registers <gb-empty>
```

```html
<gb-panel label="Player">
  <gb-stat label="Rating">2,214</gb-stat>
  <gb-stat label="Deflects">1,204</gb-stat>
</gb-panel>
<gb-panel label="Matches">
  <gb-empty>
    No matches yet.
    <gb-button slot="action" variant="primary">Host a ranked lobby</gb-button>
  </gb-empty>
</gb-panel>
```

- `<gb-panel>` is a flat box: `panel` fill and a 1px line, no shadow. `label` puts a small uppercase heading over it (a level 2 heading for screen readers; `level` changes that). `raised` is for a box inside a panel: one step up, no line. `compact` has 12px padding instead of 16px.
- `<gb-stat>` is one number with its label in a raised tile: big, condensed and tabular. Format the number yourself ("1,204", "54%"); it's the content, so it shows before the script loads.
- `<gb-empty>` goes where a list, table or chart would be: one muted line saying what's missing, and an optional next step in the `action` slot. No second line explaining it.

### Nav and tabs

```ts
import "@genji-ball-team/ui/nav.js"; // registers <gb-nav>
import "@genji-ball-team/ui/tabs.js"; // registers <gb-tabs>
```

```html
<gb-nav aria-label="Main">
  <a href="/" aria-current="page"><gb-icon name="leaderboard"></gb-icon>Leaderboard</a>
  <a href="/matches"><gb-icon name="matches"></gb-icon>Matches</a>
</gb-nav>

<gb-tabs label="Player stats">
  <button>Overview</button>
  <button>Matches</button>
  <section>…</section>
  <section>…</section>
</gb-tabs>
```

- `<gb-nav>` is for links between pages. They stay plain `<a>` links, so they work with any router and before the script loads. Mark the current one `aria-current="page"`: it gets the raised fill and a green icon (a green bar if it has no icon). On a narrow screen the row scrolls sideways and starts with the current link in view; call `nav.revealCurrent()` after moving `aria-current` without a page load.
- `<gb-tabs>` is for sections of one page. Each `<button>` child is a tab and each other child its panel, in the same order. `selected` is the shown tab's index; picking a tab updates it and fires `change`. The arrow keys, Home and End move between tabs, and Tab goes on to the panel. A disabled button is skipped.

Items are 32px tall, 40px on touch screens. Neither has a shadow root; their styles are added to the page once, like the field's.

### Leaderboard and tables

```ts
import "@genji-ball-team/ui/leaderboard.js"; // registers <gb-leaderboard>
import "@genji-ball-team/ui/table.js"; // registers <gb-table>
import "@genji-ball-team/ui/delta.js"; // registers <gb-delta>
```

```html
<gb-leaderboard>
  <table>
    <thead>
      <tr>
        <th>Place</th>
        <th>Player</th>
        <th>Tier</th>
        <th>Rating</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      <tr data-tier="sovereign" data-title="god">
        <td>1</td>
        <td><a href="/player/kyoryu">Kyoryu</a><gb-chip title-chip="god">God</gb-chip></td>
        <td><gb-chip tier="sovereign">Sovereign</gb-chip></td>
        <td>2,871</td>
        <td><gb-delta value="24"></gb-delta></td>
      </tr>
    </tbody>
  </table>
</gb-leaderboard>

<gb-table sticky>
  <table>
    <thead>
      <tr>
        <th data-sort>Map</th>
        <th data-sort data-type="number" aria-sort="descending">Goals</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Ayutthaya</td>
        <td>4</td>
      </tr>
    </tbody>
  </table>
</gb-table>
```

- `<gb-leaderboard>` is the brand sheet's leaderboard: one rounded row per player with the tier bar (`data-tier`), place, name, tier chip, rating and change. `data-title="god"` or `"demigod"` gives a row its title look, the only rows that move (still under reduced motion). Put the name first in its cell, in an `<a>` or `<span>`, so a long one is cut short. In a box narrower than 440px the tier chip moves under the name. The header row is read by screen readers but not shown.
- `<gb-table>` is any other data table: compact rows, tabular numbers, every other row raised, 40px rows on phones. A table too wide for its box scrolls sideways with the first column held still. `data-type="number"` on a header lines its column up on the right. `data-sort` makes a header a sort button: numbers sort high to low first, text A to Z, and `aria-sort` follows. It fires a cancelable `sort` event (`detail: { column, direction }`) first; cancel it to sort on the server. A cell's `data-value` is sorted on instead of its text. `sticky` keeps the header in view while the table scrolls in its own box, up to `--gb-table-height` (70vh).
- `<gb-delta value="-11">` is a rating change: "▲ 24" in `up`, "▼ 11" in `down`, a muted "–" for 0. Screen readers hear "up 24".

Both tables keep a real `<table>` in the page, so they show before the script loads. Neither has a shadow root; their styles are added to the page once.

### Avatars

```ts
import "@genji-ball-team/ui/avatar.js"; // registers <gb-avatar>
```

```html
<gb-avatar name="Kyoryu" src="https://cdn.discordapp.com/avatars/…"></gb-avatar> Kyoryu
```

A player's picture, or the grey first letter of their name when there's no `src` or it fails to load. **Hidden by default:** players have no pictures until they can link Discord, so nothing shows until the app sets `--gb-avatar-display: inline-block` (on `:root` to turn avatars on everywhere). `size` sets the side in pixels (32 by default). It's hidden from screen readers, since the name is always next to it.

The tokens come from [src/tokens.ts](src/tokens.ts). A test checks them against the tables in brand.md, so change brand.md first.

## Working on it

```sh
npm ci
npm run check   # typecheck, lint, tests, build
```

## License

No open-source license yet. See [LICENSE.md](LICENSE.md).
