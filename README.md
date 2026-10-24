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

The tokens come from [src/tokens.ts](src/tokens.ts). A test checks them against the tables in brand.md, so change brand.md first.

## Working on it

```sh
npm ci
npm run check   # typecheck, lint, tests, build
```

## License

No open-source license yet. See [LICENSE.md](LICENSE.md).
