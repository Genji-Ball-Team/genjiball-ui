// Builds the gallery site into gallery-dist/ from the built package, so the gallery shows exactly what
// npm gets: dist/ is copied to gallery-dist/ui/ and every page loads its components from there. Each
// page in gallery/pages.json is gallery/pages/<slug>.html (or generated, for tokens and icons) inside
// one shell with the page list. Runs after `npm run build`, from the repo root.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import process from "node:process";
import { generatedPages } from "./gallery-generated.js";

const out = "gallery-dist";
/** @type {{ group: string, slug: string, title: string, modules: string[] }[]} */
const pages = JSON.parse(readFileSync("gallery/pages.json", "utf8"));
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const repo = "https://github.com/Genji-Ball-Team/genjiball-ui";

if (!existsSync("dist/base.css")) throw new Error("No dist/ yet: run `npm run build` first");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync("dist", `${out}/ui`, { recursive: true });
cpSync("gallery/gallery.css", `${out}/gallery.css`);
for (const file of ["favicon.svg", "avatar-example.svg"])
  cpSync(`gallery/${file}`, `${out}/${file}`);
cpSync("docs/brand-sheet.html", `${out}/brand-sheet.html`);

/** @param {string} slug */
const href = (slug) => (slug === "index" ? "./" : `${slug}.html`);

/** The page list, grouped, with the current page marked. @param {string} current */
function sideNav(current) {
  const groups = [...new Set(pages.map((page) => page.group))];
  const lists = groups.map((group) => {
    const links = pages
      .filter((page) => page.group === group)
      .map(({ slug, title }) => {
        const mark = slug === current ? ' aria-current="page"' : "";
        return `<li><a href="${href(slug)}"${mark}>${title}</a></li>`;
      });
    return `<h2 class="gb-label">${group}</h2><ul>${links.join("")}</ul>`;
  });
  const brand = [
    `<li><a href="brand-sheet.html">Brand sheet</a></li>`,
    `<li><a href="${repo}/blob/main/docs/brand.md">brand.md</a></li>`,
  ];
  return `${lists.join("")}<h2 class="gb-label">Brand</h2><ul>${brand.join("")}</ul>`;
}

/** The import lines a page's components need, as the app would write them. @param {string[]} modules */
function usage(modules) {
  if (modules.length === 0) return "";
  const lines = modules.map((name) => `import "@genji-ball-team/ui/${name}.js";`);
  return `<pre class="g-usage"><code>${lines.join("\n")}</code></pre>`;
}

/** @param {{ slug: string, title: string, modules: string[] }} page @param {string} body */
function shell(page, body) {
  const imports = page.modules.map((name) => `import "./ui/${name}.js";`).join(" ");
  const title = page.slug === "index" ? "Genji Ball UI" : `${page.title} · Genji Ball UI`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="favicon.svg">
<link rel="stylesheet" href="ui/base.css">
<link rel="stylesheet" href="gallery.css">
${imports ? `<script type="module">${imports}</script>` : ""}
</head>
<body>
<a class="g-skip" href="#main">Skip to content</a>
<div class="g-shell">
<aside class="g-side"><div class="g-side-inner">
<a class="g-brand" href="./"><img src="favicon.svg" alt="" width="24" height="24"><span>Genji Ball <b>UI</b></span></a>
<span class="g-version gb-num">v${version}</span>
<nav aria-label="Gallery">${sideNav(page.slug)}</nav>
</div></aside>
<main id="main" class="g-main">
${page.slug === "index" ? "" : `<header class="g-head"><h1>${page.title}</h1>${usage(page.modules)}</header>`}
${body}
</main>
</div>
</body>
</html>
`;
}

const generated = generatedPages();
for (const page of pages) {
  const file = `gallery/pages/${page.slug}.html`;
  const body = generated[page.slug] ?? readFileSync(file, "utf8");
  writeFileSync(`${out}/${page.slug}.html`, shell(page, body));
}
process.stdout.write(`${out}/: ${pages.length} pages\n`);
