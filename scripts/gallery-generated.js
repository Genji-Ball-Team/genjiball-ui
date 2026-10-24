// The gallery pages written from the package's own data, so they can't drift from it: the tokens
// page from tokens.ts and the icons page from icons.ts. Used by build-gallery.js.
import { icons } from "../dist/icons.js";
import { tokens } from "../dist/tokens.js";

/** @param {string} prefix */
const named = (prefix) => Object.keys(tokens).filter((name) => name.startsWith(prefix));

const colourGroups = [
  { title: "Surfaces and text", names: Object.keys(tokens).slice(0, 9) },
  { title: "Meaning", names: ["green", "up", "down", "gold"] },
  { title: "Titles", names: [...named("god"), ...named("demi")] },
  { title: "Rank tiers", names: named("t-") },
];

/** @param {string} name */
function swatch(name) {
  const value = tokens[/** @type {keyof typeof tokens} */ (name)];
  return `<figure class="g-swatch"><span style="background: var(--${name})"></span><figcaption><code>--${name}</code><span>${value}</span></figcaption></figure>`;
}

/** @param {string[]} names */
function valueTable(names) {
  const rows = names.map((name) => {
    const value = tokens[/** @type {keyof typeof tokens} */ (name)];
    return `<tr><td><code>--${name}</code></td><td>${value}</td></tr>`;
  });
  return `<table class="g-values"><thead><tr><th>Token</th><th>Value</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

/** @param {string} title @param {string} content */
const section = (title, content) =>
  `<section class="g-section"><h2>${title}</h2>${content}</section>`;

function tokensPage() {
  const colours = colourGroups.map(({ title, names }) =>
    section(title, `<div class="g-swatches">${names.map(swatch).join("")}</div>`),
  );
  const depth = `<div class="g-row">
<div class="g-depth" style="background: var(--panel); border: 1px solid var(--line)">panel</div>
<div class="g-depth" style="background: var(--raised)">raised</div>
<div class="g-depth" style="background: var(--raised); border: 1px solid var(--border); box-shadow: var(--shadow-float)">shadow-float</div>
<div class="g-depth g-scrim"><span>scrim</span></div>
</div>`;
  const rest = ["r", "r-chip", "shadow-float", "scrim"];
  const motion = Object.keys(tokens).filter((name) => /duration|ease|delay/.test(name));
  const type = [
    "font",
    ...Object.keys(tokens).filter((name) => /-(size|weight|width|tracking)$/.test(name)),
  ];
  return [
    ...colours,
    section("Shape and depth", depth + valueTable(rest)),
    section("Type", valueTable(type)),
    section("Motion", valueTable(motion)),
  ].join("\n");
}

function iconsPage() {
  const sizes = [16, 20, 24, 32, 48];
  const cards = Object.keys(icons).map((name) => {
    const at = sizes.map(
      (size) =>
        `<gb-icon name="${name}" style="inline-size: ${size}px; block-size: ${size}px"></gb-icon>`,
    );
    return `<figure class="g-icon"><div>${at.join("")}</div><figcaption><code>${name}</code></figcaption></figure>`;
  });
  const colours = ["fg", "soft", "muted", "green"].map(
    (name) =>
      `<span class="g-icon-row" style="color: var(--${name})">${Object.keys(icons)
        .map((icon) => `<gb-icon name="${icon}"></gb-icon>`)
        .join("")}<code>--${name}</code></span>`,
  );
  return [
    section("The set", `<div class="g-icons">${cards.join("")}</div>`),
    section("In the text colour", `<div class="g-stack">${colours.join("")}</div>`),
  ].join("\n");
}

/** The generated pages' bodies, by slug. @returns {Record<string, string>} */
export function generatedPages() {
  return { tokens: tokensPage(), icons: iconsPage() };
}
