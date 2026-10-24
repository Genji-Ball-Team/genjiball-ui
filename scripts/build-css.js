// Writes dist/tokens.css from the compiled tokens, so the CSS and the TS export can't disagree.
// Runs after tsc in `npm run build`, from the repo root.
import { writeFileSync } from "node:fs";
import { tokensCss } from "../dist/tokens.js";

writeFileSync("dist/tokens.css", tokensCss());
