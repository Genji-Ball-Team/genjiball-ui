# Genji Ball UI

The Genji Ball UI library: design tokens, CSS, icons and framework-free web components (`<gb-…>`), published as `@genji-ball-team/ui` on npm. Used by the ranked website and the host tool, both plain TypeScript with no framework.

## Commands

```sh
npm ci          # also installs the pre-commit hook
npm run check   # typecheck, Prettier, ESLint, size check, Vitest, build
npm run format  # Prettier --write
npm run build   # dist/: ESM and .d.ts, what npm gets
```

`npm run check` is what CI runs, and **it must pass before a change is done.** It includes the contrast test (`test/contrast.test.ts`), which fails the build when a token pair drops below WCAG 2.1 AA.

- Code follows the team [STYLE.md](https://github.com/Genji-Ball-Team/.github/blob/main/STYLE.md); the lint config comes from `@genji-ball-team/style`.
- Each component is its own module under `src/`, exported as `@genji-ball-team/ui/<path>.js`. No `index.ts` that only re-exports.
- Register elements with `defineElement` (`src/define.ts`), never `customElements.define` directly.
- Tests run in happy-dom (`test/`).

## The brand is the spec

[docs/brand.md](docs/brand.md) holds every brand decision and [docs/brand-sheet.html](docs/brand-sheet.html) shows them on one page. Follow them; don't guess past them.

- Change a rule in `docs/brand.md` first (and the brand sheet if it shows it), in its own PR, then the code.
- Colours are OKLCH tokens named by role (`--bg`, `--panel`, `--up`, `--down`, `--t-master`), never by hue, and never hard-coded in a component.
- Every text and UI colour must pass WCAG 2.1 AA against the surfaces it sits on. The contrast test enforces it.
- Restraint: the God and Demigod titles are the only things that loop or glow. Other motion plays once and is off under `prefers-reduced-motion`.
- Subtext is the exception: no muted caption on every card or panel.
- Rank tier colours are shared with genjiball-ranked (`src/config.ts`) and the game (CE `v1.3.3R`, `src/features/rank-tags.opy`). Changing one means changing all three.

## Components

- Web components prefixed `gb-`, no framework, no runtime dependencies. They must work in a Cloudflare Worker-rendered page and in the Tauri webview.
- Keyboard and screen reader first: every control is reachable by keyboard, has a visible green focus ring and a label.
- Each component's gallery page shows every state (default, hover, focus, disabled, loading, error, empty).

## Releases

Versioned, published to npm from CI: with the `NPM_TOKEN` secret until trusted publishing is set up, by 2027-01-01 (#4). Never put a token in the repo. Apps upgrade deliberately; a breaking change is a major version and says what to change in the release notes.

## PR habits

- One topic per PR, branched from `main`. Fill in `.github/PULL_REQUEST_TEMPLATE.md`, and link the issue (`Fixes #12`).
- A visual change shows a screenshot or the gallery page in the PR.
- Commits are made as `GenjiBallTeam`.

## Other repos

| Repo                      | What it is                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `GenjiBall-CE`            | The game. Rank tags and their colours are on its `v1.3.3R` branch                  |
| `genjiball-ranked`        | Cloudflare Worker: API, ratings and the website at genjiball.us. Uses this library |
| `genjiball-host-tool`     | Tauri app that uploads matches. Uses this library                                  |
| `Discord-Bot`             | Discord bot reading the ranked API. Uses the brand colours in embeds               |
| `genjiball-ui` (this one) | The UI library                                                                     |

- An issue here may need work in another repo. Keep one PR per repo and link them to each other (`Genji-Ball-Team/genjiball-ranked#12`).
- Each repo has its own `AGENTS.md`; follow it when working there.
