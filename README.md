# Genji Ball UI

The UI library for everything Genji Ball: design tokens, CSS, icons and framework-free web components (`<gb-…>`), published as `@genji-ball-team/ui` on npm.

It's built for the [ranked website](https://github.com/Genji-Ball-Team/genjiball-ranked) (genjiball.us) and the [host tool](https://github.com/Genji-Ball-Team/genjiball-host-tool), which are both plain TypeScript with no framework, so the components carry their own behaviour.

- **Brand rules:** [docs/brand.md](docs/brand.md). Every colour, type, icon, motion and component decision, with the reasons.
- **Brand sheet:** [docs/brand-sheet.html](docs/brand-sheet.html). All of the rules on one page; open it in a browser.
- **Gallery:** [ui.genjiball.us](https://ui.genjiball.us). Every component in every state, built from the package (see [The gallery](#the-gallery)).
- **Discord:** [discord.gg/sv9VVjh5pT](https://discord.gg/sv9VVjh5pT)

## Status

Brand decided, package set up, components in progress. The plan is in the [milestones](https://github.com/Genji-Ball-Team/genjiball-ui/milestones):

1. **Brand:** review the brand sheet and run a second brainstorm for what's still open.
2. **v0.1 Foundations:** package, tokens, base CSS, Saira, icons, contrast test, npm publishing.
3. **v0.2 Components:** buttons, inputs, chips, leaderboard rows, chart, toasts, dialogs and the rest.
4. **Gallery:** a site showing every component and state. Live at [ui.genjiball.us](https://ui.genjiball.us).
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

The set: `player`, `matches`, `records`, `deflects`, `live`, `leaderboard`, `search`, `close`, `back`, `next`, `share`, `enlarge`, `external`, `copy`, `tourney`. They're drawn in `currentColor`, so they take the text colour. `<gb-icon>` is 1.25em by default; set `inline-size` and `block-size` to change that. Leave `label` off when text next to the icon already says the same (the icon is then hidden from screen readers), and always give one to an icon-only button. The SVG files are in the package too, as `dist/icons/<name>.svg`.

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

It's 36px tall, 40px on touch screens. `aria-label`, `aria-description`, `aria-expanded` and `aria-haspopup` set on `<gb-button>` are passed on to the button inside it, so an icon-only button gets its name with `aria-label`.

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

### Tooltips

```ts
import "@genji-ball-team/ui/tooltip.js"; // registers <gb-tooltip>
```

```html
<gb-tooltip text="Copies the ranked code with rank tags">
  <gb-button variant="ghost">Copy code</gb-button>
</gb-tooltip>
```

A short hint about the one element inside. It shows after about 400ms of hover, straight away on keyboard focus, and Escape hides it. It never shows on touch, so nothing may only be said in a tooltip, and an icon-only button still needs its own `aria-label`. The text describes the element to screen readers (unless it only repeats its name).

### Popovers

```ts
import "@genji-ball-team/ui/popover.js"; // registers <gb-popover>
```

```html
<gb-popover>
  <gb-button>Filters</gb-button>
  <div aria-label="Filters">
    <gb-field label="Region"
      ><select>
        …
      </select></gb-field
    >
    <gb-button variant="primary">Apply</gb-button>
  </div>
</gb-popover>
```

The first child is the button, the last is the panel it opens. The panel opens below the button (above when there's no room), focus moves into it, and a click outside, Escape or focus leaving closes it; Escape puts focus back on the button. `show()`, `hide()`, `toggle()` and `open` drive it from code, and it fires `open` and `close`.

### Menus

```ts
import "@genji-ball-team/ui/menu.js"; // registers <gb-menu>
```

```html
<gb-menu label="Match actions">
  <gb-button variant="ghost" aria-label="Match actions">⋯</gb-button>
  <div>
    <button>Copy match link</button>
    <a href="/admin/matches/412">Open in admin</a>
    <hr />
    <button data-danger>Delete match</button>
  </div>
</gb-menu>
```

A list of actions, laid out like a popover. The panel's `<button>`s and links are the items; `<hr>` is a divider. Arrow keys, Home, End and a first letter move between items, Enter or a click runs one and closes the menu, and Escape or Tab closes it. Choosing an item fires `select` on the menu with the item as `detail`. A `data-danger` item is orange; put it last, after a divider, and confirm before doing it. Items are 32px tall, 40px on touch screens.

### Dialogs

```ts
import { confirmDialog } from "@genji-ball-team/ui/dialog.js"; // registers <gb-dialog>

if (
  await confirmDialog({
    title: "Delete this match?",
    text: "Its rating changes are undone for all six players.",
    action: "Delete match",
    danger: true,
  })
) {
  await deleteMatch();
}
```

Only for confirmations. The title is the question, `text` one line on what happens, and `action` names what the button does ("Delete match", not "OK"). Cancel comes first and has focus; Escape or a click on the dimmed page cancels. It resolves `true` for the action, `false` otherwise.

For a dialog of your own, use `<gb-dialog label="…">` with the text inside and buttons in `slot="actions"`: a button with a `value` closes it with that `returnValue`. `show()` opens it, `close(value)` closes it and fires `close`, and focus goes back where it was.

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

### Segmented control, pager and recent form

```ts
import "@genji-ball-team/ui/segmented.js"; // registers <gb-segmented>
import "@genji-ball-team/ui/pager.js"; // registers <gb-pager>
import "@genji-ball-team/ui/form-row.js"; // registers <gb-form-row>
```

```html
<gb-segmented label="View" value="rating">
  <button value="rating">Rating</button>
  <button value="places">Places</button>
</gb-segmented>

<gb-segmented label="Region">
  <a href="?region=eu" aria-current="true">EU</a>
  <a href="?region=na">NA</a>
</gb-segmented>

<gb-pager page="2" pages="9" href="/matches?page={page}"></gb-pager>

<gb-form-row label="Recent form"></gb-form-row>
```

```js
row.results = [{ place: 1, players: 6, href: "/match?id=812", label: "Won round 3 of match #812" }];
```

- `<gb-segmented>` is one choice out of 2 to 4 options, for changing the view of a page. With `<button>` children it is a radio group: `value` is the chosen option's `value` attribute (else its text), the first enabled option when none matches. Picking one sets `value` and fires `change` (not when the app sets it); the arrow keys move the choice, and a disabled button is skipped. With `<a>` children each option is a page (the region switch): mark the chosen one `aria-current="true"`; it is a plain navigation and Tab reaches every link.
- `<gb-pager>` is "← Previous", "Page 2 of 9" and "Next →". `href` is the URL of a page with `{page}` in it, so every page is a real link. `pages` can be left off when the server only says whether another page follows: add `more` to show Next, and the text is "Page 2". The end that can't go anywhere is hidden but keeps its space; with a single page nothing shows. `pager.page` and `pager.pages` read and set the attributes, `pager.url(n)` gives a page's URL.
- `<gb-form-row>` is a player's last rounds as small squares, oldest left. Set `results` to `{ place, players, href, label? }` items. Each square is a link to its match showing the place; `label` is its name for screen readers and tooltip (default "Won" or "3rd of 6"). A win is filled with `up` with dark text. No results shows the `empty` text (default "No matches yet.").

The segmented options are 32px tall inside a 3px track, the pager links 36px and the form squares 24px; all are 40px on touch screens. None has a shadow root; their styles are added to the page once, like the field's.

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

### Rating chart

```ts
import "@genji-ball-team/ui/rating-chart.js"; // registers <gb-rating-chart>

const chart = document.querySelector("gb-rating-chart");
chart.points = [
  { rating: 1830, label: "Match #412", place: 3, players: 6, href: "/match?id=412" },
  { rating: 1854, label: "Match #415", place: 1, players: 6, href: "/match?id=415" },
];
chart.tiers = [{ tier: "grandmaster", label: "Grandmaster", threshold: 1900 }];
```

```html
<gb-rating-chart label="Rating over the last 40 matches"></gb-rating-chart>
```

- A player's rating after each match, oldest first, drawn as brand.md's Charts section says. The whole line is `up` if the rating went up over the points shown, `down` if it went down. `direction` on the element (`up`, `down` or `none`) says which, so a `<gb-delta>` in the header can match it.
- Tiers near the ratings shown get a dashed line in their colour with their chip, placed where the line doesn't run through it. No bands.
- Hover, a tap or the arrow keys (Home and End too) show a green crosshair and a tooltip with the match, place, rating, change and "Open match →". Screen readers hear each point as the keys reach it. A point's `change` is worked out from the point before when it isn't given.
- A mouse click, a second tap on the same point, or Enter fires a cancelable `open` event (`detail: { index, point }`), then goes to the point's `href`. Cancel it to open the match some other way.
- One axis, on the left. It draws at its box's width, 240px tall (180px under 480px wide), or the `height` attribute. `--gb-chart-bg` is the surface it sits on (`panel` unless the app says so). With no points it draws nothing; show a `<gb-empty>` instead.

### Compare chart

```ts
import "@genji-ball-team/ui/compare-chart.js"; // registers <gb-compare-chart>

const chart = document.querySelector("gb-compare-chart");
chart.series = [
  {
    name: "Ana",
    points: [
      { rating: 1830, at: "2026-10-05T18:02:00Z", label: "Match #412", href: "/match?id=412" },
    ],
  },
  {
    name: "Ben",
    points: [
      { rating: 1790, at: "2026-10-05T19:30:00Z", label: "Match #413", href: "/match?id=413" },
    ],
  },
];
chart.tiers = [{ tier: "grandmaster", label: "Grandmaster", threshold: 1900 }];
```

```html
<gb-compare-chart axis="time" label="Ratings over time"></gb-compare-chart>
```

- Up to three players' ratings on one chart (more are ignored). Players are told apart by stroke, not hue: `fg` solid, `soft` dashed, `muted` dotted. Each name is at its line's end (cut at 14 letters, 10 on a phone) and whole in a key above the chart. There is no up or down colour and no `direction`.
- `axis="matches"` (the default) puts every player's nth match in the same place, with lines from match to match. `axis="time"` puts each match where it was played (`at`: milliseconds or an ISO date) and draws steps, since a rating holds until the next match.
- Tiers near the ratings shown get a dashed line and chip, placed clear of every line.
- Hover, a tap or the arrow keys (Home and End too) show a green crosshair and a tooltip with every player's rating at that point (a dash before their first match). A click, a second tap or Enter fires a cancelable `open` event (`detail: { series, index, point }`) for the player whose point under the cursor is nearest, then goes to the point's `href`.
- `label` is what screen readers hear first, `height` and `--gb-chart-bg` work as on the rating chart. With no points it draws nothing; show a `<gb-empty>` instead.

### Bar chart

```ts
import "@genji-ball-team/ui/bar-chart.js"; // registers <gb-bar-chart>

const chart = document.querySelector("gb-bar-chart");
chart.bars = [
  {
    value: 12,
    label: "Mon, Oct 5",
    axis: "Oct 5",
    text: "12 rated rounds",
    detail: "3 matches · 5 players",
  },
  { value: 0, label: "Tue, Oct 6", axis: "Today", text: "0 rated rounds" },
];
```

```html
<gb-bar-chart label="Rated rounds a day" height="120"></gb-bar-chart>
```

- A bar for each day with a value, oldest first, in `muted`; the hovered or focused one is `fg`. A zero is a 2px stub in `border`. Bars are rounded at the top only.
- The axis is the first and last bar's `axis` (or `label`). The chart's `label` is read with the highest value ("Rated rounds a day, most 24").
- Hover or focus shows a tooltip with `text` (or the number), `label` and `detail`. Tab stops once on the row; the arrow keys, Home and End step between the bars. Each bar has a screen-reader label with its value.
- `height` in pixels, 120 without it. With no bars it draws nothing; show a `<gb-empty>` instead.

### Motion: count-up and the blade slash

```ts
import "@genji-ball-team/ui/count.js"; // registers <gb-count>
import "@genji-ball-team/ui/slash.js"; // registers <gb-slash>
import "@genji-ball-team/ui/delta.js"; // registers <gb-delta>
```

```html
<gb-slash>
  <gb-stat label="Rating">
    <gb-count value="1818"></gb-count> <gb-delta value="-11"></gb-delta>
  </gb-stat>
</gb-slash>
```

```ts
// After a match, in front of the player: the number counts up, the slash cuts across, the delta fades in.
count.value = 1842;
delta.value = 24;
```

- `<gb-count>` is a whole number, formatted ("1,842") and tabular. The first value shows straight away; only a change from one number to another counts, over 0.6s with an ease-out. Screen readers get the new value at once. It fires a bubbling `count` event when it starts.
- `<gb-slash>` is brand.md's blade slash: a thin green line cuts across its content once (0.55s) and fades. It plays when a `<gb-count>` inside it starts counting, or on `play()`. It's a block with the 6px radius; wrap the panel or tile that changed.
- `<gb-delta>` fades in when its value changes from one number to another, just after the count starts.
- None of it plays on page load or loops. Under reduced motion, or on a page in the background, the new numbers show at once and nothing moves.

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
npm run check   # typecheck, lint, tests, build, gallery
```

### The gallery

`npm run build && npm run gallery` writes the gallery to `gallery-dist/`, a static site that loads the built package from `gallery-dist/ui/`. Serve that folder with any static server to look at it. Each page's source is in `gallery/pages/`, listed in `gallery/pages.json`; the tokens and icons pages are generated from `src/`. A test fails when an element the package defines isn't on any page, so a new component comes with its page.

`npm run gallery:deploy` puts it on ui.genjiball.us (a Cloudflare Worker with static assets, `gallery/wrangler.jsonc`). It's run by hand: check `npx wrangler whoami` shows the Genji Ball account first.

## License

No open-source license yet. See [LICENSE.md](LICENSE.md).
