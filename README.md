# Genji Ball UI

The UI library for everything Genji Ball: design tokens, CSS, icons and framework-free web components (`<gb-…>`), published as `@genji-ball-team/ui` on npm.

It's built for the [ranked website](https://github.com/Genji-Ball-Team/genjiball-ranked) (genjiball.us) and the [host tool](https://github.com/Genji-Ball-Team/genjiball-host-tool), which are both plain TypeScript with no framework, so the components carry their own behaviour.

- **Brand rules:** [docs/brand.md](docs/brand.md). Every colour, type, icon, motion and component decision, with the reasons.
- **Brand sheet:** [docs/brand-sheet.html](docs/brand-sheet.html). All of the rules on one page; open it in a browser.
- **Discord:** [discord.gg/sv9VVjh5pT](https://discord.gg/sv9VVjh5pT)

## Status

Brand decided, package set up, components not built yet. The plan is in the [milestones](https://github.com/Genji-Ball-Team/genjiball-ui/milestones):

1. **Brand:** review the brand sheet and run a second brainstorm for what's still open.
2. **v0.1 Foundations:** package, tokens, base CSS, Saira, icons, contrast test, npm publishing.
3. **v0.2 Components:** buttons, inputs, chips, leaderboard rows, chart, toasts, dialogs and the rest.
4. **Gallery:** a site showing every component and state.
5. **Adoption:** the website and host tool switch to the library.

## Using it

```ts
import "@genji-ball-team/ui/tokens.css"; // every token as a :root custom property: var(--panel), var(--t-master)
import { tokens } from "@genji-ball-team/ui/tokens.js"; // the same values for code: tokens.up, tokens["t-master"]
```

The tokens come from [src/tokens.ts](src/tokens.ts). A test checks them against the tables in brand.md, so change brand.md first.

## Working on it

```sh
npm ci
npm run check   # typecheck, lint, tests, build
```

## License

No open-source license yet. See [LICENSE.md](LICENSE.md).
