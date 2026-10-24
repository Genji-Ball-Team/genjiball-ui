/** An sRGB colour, each channel 0 to 1, gamma-encoded like CSS `rgb()`. */
export type Rgb = readonly [r: number, g: number, b: number];

/**
 * Converts a CSS `oklch(L% C H)` colour (as in the tokens) to sRGB, clipping channels that fall
 * outside the sRGB gamut. Alpha is ignored. Uses Björn Ottosson's OKLab matrices.
 */
export function oklchToRgb(value: string): Rgb {
  const match = /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)(?: \/ [\d.]+)?\)$/.exec(value);
  if (!match) throw new Error(`Not an oklch() colour: ${value}`);
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** `#rrggbb` for a token colour, for places that can't take OKLCH (Discord embeds). */
export function toHex(value: string): string {
  const hex = oklchToRgb(value).map((channel) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${hex.join("")}`;
}

/** `over` painted on `under` at `alpha` opacity, blended in sRGB like a browser does. */
export function blend(over: Rgb, under: Rgb, alpha: number): Rgb {
  return [
    over[0] * alpha + under[0] * (1 - alpha),
    over[1] * alpha + under[1] * (1 - alpha),
    over[2] * alpha + under[2] * (1 - alpha),
  ];
}

/** The WCAG 2.1 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Linear-light channel to gamma-encoded sRGB, clipped to 0..1. */
function encode(linear: number): number {
  const clipped = Math.min(1, Math.max(0, linear));
  return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
