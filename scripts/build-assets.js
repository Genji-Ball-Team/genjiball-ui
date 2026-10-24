// Writes dist/tokens.css from the compiled tokens, so the CSS and the TS export can't disagree, and
// dist/icons/<name>.svg from the compiled icon set, for apps that want the files (the host tool's
// app shell, a README). Copies base.css and the Saira font files next to them. Runs after tsc in
// `npm run build`, from the repo root.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { iconSvg, icons } from "../dist/icons.js";
import { tokensCss } from "../dist/tokens.js";

writeFileSync("dist/tokens.css", tokensCss());
mkdirSync("dist/icons");
for (const name of Object.keys(icons))
  writeFileSync(`dist/icons/${name}.svg`, `${iconSvg(name)}\n`);
cpSync("src/base.css", "dist/base.css");
cpSync("src/fonts", "dist/fonts", { recursive: true });
