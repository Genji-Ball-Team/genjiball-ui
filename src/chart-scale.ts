/** A chart's vertical range and the round values its axis labels, lowest first. */
export interface ChartScale {
  readonly lo: number;
  readonly hi: number;
  readonly ticks: readonly number[];
}

// Round steps for the axis, so it carries at most four or five labels.
const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/**
 * The range a rating chart shows: every value, with 8% room above and below, and every tier
 * threshold within `reach` of it, so crossing into the next tier is a line the player can see
 * coming. At least `minSpan` tall, so a flat run doesn't blow small changes up into cliffs.
 */
export function chartScale(
  values: readonly number[],
  {
    thresholds = [],
    reach = 50,
    minSpan = 40,
  }: { thresholds?: readonly number[]; reach?: number; minSpan?: number } = {},
): ChartScale {
  if (values.length === 0) return { lo: 0, hi: 0, ticks: [] };
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  for (const threshold of thresholds) {
    if (threshold >= lo - reach && threshold <= hi + reach) {
      lo = Math.min(lo, threshold);
      hi = Math.max(hi, threshold);
    }
  }
  const middle = (lo + hi) / 2;
  const span = Math.max(hi - lo, minSpan);
  lo = Math.min(lo, middle - span / 2) - span * 0.08;
  hi = Math.max(hi, middle + span / 2) + span * 0.08;
  const step = steps.find((s) => (hi - lo) / s <= 4.5) ?? 10000;
  const ticks: number[] = [];
  for (let tick = Math.ceil(lo / step) * step; tick <= hi; tick += step) ticks.push(tick);
  return { lo, hi, ticks };
}

const ordinals = new Intl.PluralRules("en", { type: "ordinal" });
const suffixes: Partial<Record<Intl.LDMLPluralRule, string>> = { one: "st", two: "nd", few: "rd" };

/** "1st", "2nd", "23rd", "11th": a place in a match. */
export function ordinal(place: number): string {
  return `${place}${suffixes[ordinals.select(place)] ?? "th"}`;
}

/** A point or box corner in a chart's pixels. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/**
 * Whether the line through `spots` (left to right) passes through the box from `from` to `to`, give
 * or take `margin` pixels. A chart puts its labels where this is false, so the line never runs
 * through their text.
 */
export function lineCrosses(spots: readonly Spot[], from: Spot, to: Spot, margin = 2): boolean {
  const ys: number[] = [];
  spots.forEach((spot, index) => {
    const next = spots[index + 1] ?? spot;
    const left = Math.max(spot.x, from.x);
    const right = Math.min(next.x, to.x);
    if (left > right) return;
    const at = (x: number) =>
      next.x === spot.x ? spot.y : spot.y + ((x - spot.x) / (next.x - spot.x)) * (next.y - spot.y);
    ys.push(at(left), at(right));
  });
  if (ys.length === 0) return false;
  return Math.min(...ys) - margin < to.y && Math.max(...ys) + margin > from.y;
}
