import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

// AGENTS.md: each component's gallery page shows every state. This keeps a new component from
// shipping without one, and the page list pointing at real modules and pages.
const pages = JSON.parse(readFileSync("gallery/pages.json", "utf8")) as {
  slug: string;
  modules: string[];
}[];
const generated = ["tokens", "icons"];

test("every page has its source and loads modules that exist", () => {
  for (const { slug, modules } of pages) {
    if (!generated.includes(slug))
      expect(existsSync(`gallery/pages/${slug}.html`), slug).toBe(true);
    for (const name of modules) expect(existsSync(`src/${name}.ts`), `${slug}: ${name}`).toBe(true);
  }
});

test("every element the package defines is shown on a gallery page", () => {
  const html = readdirSync("gallery/pages")
    .map((file) => readFileSync(`gallery/pages/${file}`, "utf8"))
    .join("\n");
  const elements = readdirSync("src")
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => [
      ...readFileSync(`src/${file}`, "utf8").matchAll(/defineElement\("(gb-[a-z-]+)"/g),
    ])
    .map((match) => match[1]);
  expect(elements.length).toBeGreaterThan(20);
  expect(elements.filter((name) => !html.includes(`<${name}`))).toEqual([]);
});
