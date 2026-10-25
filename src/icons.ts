/**
 * The icon set (docs/brand.md, Genji touch): duotone, a 1.75px rounded outline on a 24px grid over a
 * soft fill of the same colour at 22%. Each icon is its fill and its outline as SVG markup, drawn in
 * `currentColor`, so it takes the colour of the text around it. A line-only icon has an empty fill,
 * and no fill group is drawn for it.
 *
 * No ids, masks or gradients: the site renders many icons into one page, where a repeated id would
 * point every copy at the first one.
 */
export const icons = {
  // The Genji faceplate: V visor, pointed chin, shoulders.
  player: {
    fill: '<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v2.8l-2.6 5h-5.8l-2.6-5z"/>',
    outline:
      '<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v2.8l-2.6 5h-5.8l-2.6-5zM8.4 10.4l3.6 1.6 3.6-1.6M4.5 21.2c1.4-1.5 4-2.3 7.5-2.3s6.1.8 7.5 2.3"/>',
  },
  // The logo's ball, sliced by one diagonal cut through its centre (a 2.6px gap). The cut ends of the
  // outline are butt, so the gap reads as a clean cut and not as two rounded strokes.
  matches: {
    fill: '<path d="M19.63 8.25A8.5 8.5 0 0 1 5.86 17.88zM4.37 15.75A8.5 8.5 0 0 1 18.14 6.12z"/>',
    outline:
      '<path stroke-linecap="butt" d="M19.63 8.25A8.5 8.5 0 0 1 5.86 17.88M4.37 15.75A8.5 8.5 0 0 1 18.14 6.12"/>',
  },
  // A medal with a "1", on a V ribbon.
  records: {
    fill: '<circle cx="12" cy="15.5" r="5"/><path d="M7.5 3h3l2 6.2h-3zM16.5 3h-3l-1.1 3.4"/>',
    outline:
      '<path d="M7.5 3h3l2 6.2M16.5 3h-3l-1.1 3.4M14.5 3l-2 6.2"/><circle cx="12" cy="15.5" r="5"/><path d="M12 13.3v4.4M10.8 14.2l1.2-.9"/>',
  },
  // A katana blade with its guard and grip, and the arc of the slash.
  deflects: {
    fill: '<path d="M9.7 14.3C12.9 12.1 17.1 8.3 20.6 3.4 18.7 8.4 14.8 12.6 10.8 15.3z"/>',
    outline:
      '<path d="M9.7 14.3C12.9 12.1 17.1 8.3 20.6 3.4 18.7 8.4 14.8 12.6 10.8 15.3zM7.6 13.2l3.6 3.4M9 15.9 4.4 20.5M4.2 9.4A9.5 9.5 0 0 1 11 3.2"/>',
  },
  // The ball flying, with speed lines behind it.
  live: {
    fill: '<circle cx="15" cy="12" r="5.5"/>',
    outline: '<circle cx="15" cy="12" r="5.5"/><path d="M3 8.5h3.5M2 12h4M3 15.5h3.5"/>',
  },
  // A podium, 2nd, 1st and 3rd.
  leaderboard: {
    fill: '<path d="M9 9h6v11H9zM3.5 13H9v7H3.5zM15 15.5h5.5V20H15z"/>',
    outline: '<path d="M9 20V9h6v11M3.5 20v-7H9M15 15.5h5.5V20M2.5 20h19"/>',
  },
  // A lens and its handle.
  search: {
    fill: '<circle cx="10" cy="10" r="6.5"/>',
    outline: '<circle cx="10" cy="10" r="6.5"/><path d="m14.8 14.8 5.7 5.7"/>',
  },
  // An ×. Line only.
  close: {
    fill: "",
    outline: '<path d="m6.5 6.5 11 11m0-11-11 11"/>',
  },
  // An arrow pointing left. Line only.
  back: {
    fill: "",
    outline: '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  },
  // An arrow pointing right. Line only.
  next: {
    fill: "",
    outline: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  },
  // An arrow rising out of an open box.
  share: {
    fill: '<path d="M6.5 10h11a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z"/>',
    outline:
      '<path d="M8.5 10h-2a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1h-2M12 15V3.5M8.5 7 12 3.5 15.5 7"/>',
  },
  // Four corners pointing out. Line only.
  enlarge: {
    fill: "",
    outline: '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
  },
  // An arrow leaving a square at its top right corner.
  external: {
    fill: '<path d="M5.5 7.5h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"/>',
    outline:
      '<path d="M11 7.5H5.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V13M11.5 12.5l8-8M14.5 4.5h5v5"/>',
  },
  // Two sheets, the front one filled.
  copy: {
    fill: '<path d="M10 9h8.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z"/>',
    outline:
      '<path d="M10 9h8.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM6.5 15.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',
  },
  // A cup with two handles, on a short stem and foot.
  tourney: {
    fill: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM9.5 17h5v3h-5z"/>',
    outline:
      '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M9.5 17h5v3h-5z"/>',
  },
} as const satisfies Record<string, { fill: string; outline: string }>;

export type IconName = keyof typeof icons;

/** Whether `name` is an icon of the set. */
export function isIconName(name: string): name is IconName {
  return Object.hasOwn(icons, name);
}

/**
 * An icon as an `<svg>` string, for HTML rendered on the server or in a template. With a `label` it's
 * an image with that name for screen readers; without one it's decorative and hidden from them, so
 * leave the label off only when text next to it says the same. Sized 1em: set the size with CSS.
 */
export function iconSvg(name: IconName, label?: string): string {
  const { fill, outline } = icons[name];
  const a11y = label
    ? `role="img" aria-label="${escapeAttribute(label)}"`
    : 'aria-hidden="true" focusable="false"';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" ${a11y}` +
    ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
    `${fill ? `<g fill="currentColor" fill-opacity="0.22" stroke="none">${fill}</g>` : ""}${outline}</svg>`
  );
}

function escapeAttribute(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
