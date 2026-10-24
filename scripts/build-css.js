// Writes dist/tokens.css from the compiled tokens, so the CSS and the TS export can't disagree, and
// copies base.css and the Saira font files next to it. Runs after tsc in `npm run build`, from the
// repo root.
import { cpSync, writeFileSync } from "node:fs";
import { tokensCss } from "../dist/tokens.js";

writeFileSync("dist/tokens.css", tokensCss());
cpSync("src/base.css", "dist/base.css");
cpSync("src/fonts", "dist/fonts", { recursive: true });
