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

/** How many labels fit under a plot `inner` pixels wide: one per 70px, two to seven. */
export function tickCount(inner: number): number {
  return Math.max(2, Math.min(7, Math.floor(inner / 70)));
}

/** Up to `count` of the indexes 0 to `length - 1`, evenly spaced, the first and the last among them. */
export function evenIndexes(length: number, count: number): number[] {
  if (length < 1 || count < 1) return [];
  const n = Math.min(count, length);
  if (n === 1) return [0];
  return [
    ...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (length - 1)) / (n - 1)))),
  ];
}

/**
 * Which of the labels at `spans` (each one's left and right edge, left to right) to keep so that
 * none comes within `gap` of the next. The first always stays; the last wins over the ones before
 * it, so both ends of the axis keep their label.
 */
export function keepApart(spans: readonly (readonly [number, number])[], gap: number): number[] {
  const kept: number[] = [];
  const clear = (index: number) => {
    const before = spans[kept.at(-1) ?? -1];
    return !before || (spans[index]?.[0] ?? 0) >= before[1] + gap;
  };
  spans.forEach((_, index) => {
    if (index === spans.length - 1) while (kept.length > 1 && !clear(index)) kept.pop();
    if (clear(index)) kept.push(index);
  });
  return kept;
}

const hour = 3_600_000;
const day = 24 * hour;
// Round steps for a time axis: hours, days, weeks, then calendar months.
const timeSteps: TimeStep[] = [1, 3, 6, 12, 24, 48, 168, 336]
  .map((hours) => ({ size: hours * hour, months: 0 }))
  .concat([1, 3, 6, 12].map((months) => ({ size: months * 30.4 * day, months })));
const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const hourFormat = new Intl.DateTimeFormat("en", { hour: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en", { month: "short" });

/** A labelled date on a time axis, in milliseconds. */
export interface TimeTick {
  readonly at: number;
  readonly text: string;
}

type TimeStep = { readonly size: number; readonly months: number };

/**
 * Round dates from `from` to `to` (milliseconds) to label a time axis with: every so many hours,
 * days, weeks or months, in the viewer's time zone, the finest step that gives at most `count` (one
 * more when that's what it takes to have two). Labelled for the step: "3 PM" (midnight says the
 * day), "Oct 5", "Oct" (January says the year). One date when there's no span or no round hour in it.
 */
export function timeTicks(from: number, to: number, count: number): TimeTick[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || count < 1) return [];
  const one = [{ at: from, text: dayFormat.format(from) }];
  if (to <= from) return one;
  const span = to - from;
  const years = Math.ceil(span / count / (365 * day));
  let finer: TimeTick[] = [];
  for (const step of [...timeSteps, { size: years * 365 * day, months: 12 * years }]) {
    if (span / step.size > count + 1) continue;
    const ticks = stepDates(from, to, step);
    if (ticks.length <= count) {
      const best = ticks.length > 1 || finer.length === 0 ? ticks : finer;
      return best.length ? best : one;
    }
    finer = ticks;
  }
  return finer.length ? finer : one;
}

/** Every round date from `from` to `to` a step apart. */
function stepDates(from: number, to: number, step: TimeStep): TimeTick[] {
  const date = new Date(from);
  const hours = step.size / hour;
  if (step.months) {
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
    while (date.getTime() < from || date.getMonth() % Math.min(step.months, 12))
      date.setMonth(date.getMonth() + 1);
  } else if (hours >= 24) {
    date.setHours(0, 0, 0, 0);
    if (date.getTime() < from) date.setDate(date.getDate() + 1);
  } else {
    date.setMinutes(0, 0, 0);
    while (date.getTime() < from || date.getHours() % hours) date.setHours(date.getHours() + 1);
  }
  const ticks: TimeTick[] = [];
  while (date.getTime() <= to) {
    const at = date.getTime();
    let text = dayFormat.format(at);
    if (step.months) text = date.getMonth() ? monthFormat.format(at) : String(date.getFullYear());
    else if (hours < 24 && date.getHours()) text = hourFormat.format(at);
    ticks.push({ at, text });
    if (step.months) date.setMonth(date.getMonth() + step.months);
    else if (hours >= 24) date.setDate(date.getDate() + hours / 24);
    else date.setHours(date.getHours() + hours);
  }
  return ticks;
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

/**
 * Where to write labels at the ends of lines (`ends`, in pixels from the top, NaN for a line with no
 * end): each at its line's end unless that's within `gap` of the label above, then just below it, so
 * they keep their lines' order. Labels pushed past `max` are brought back up and none goes above
 * `min`, so they stay inside the chart (unless there's no room for all of them).
 *
 * `spans`, if given, is each label's left and right edge: labels side by side that don't overlap
 * don't push each other.
 */
export function spreadLabels(
  ends: readonly number[],
  {
    gap,
    min = Number.NEGATIVE_INFINITY,
    max,
    spans,
  }: { gap: number; min?: number; max: number; spans?: readonly (readonly [number, number])[] },
): number[] {
  const placed = ends.map(() => Number.NaN);
  for (const group of overlapping(ends, spans)) {
    const order = group.sort((a, b) => (ends[a] ?? 0) - (ends[b] ?? 0) || a - b);
    let last = min - gap;
    for (const index of order) {
      last = Math.max(ends[index] ?? 0, last + gap);
      placed[index] = last;
    }
    let limit = max;
    for (const index of order.reverse()) {
      limit = Math.max(Math.min(placed[index] ?? limit, limit), min);
      placed[index] = limit;
      limit -= gap;
    }
  }
  return placed;
}

/** The labels (by index, the ones with an end) in groups whose spans overlap, directly or through another. */
function overlapping(
  ends: readonly number[],
  spans: readonly (readonly [number, number])[] | undefined,
): number[][] {
  const groups: number[][] = [];
  const meets = (a: number, b: number) => {
    const [left, right] = spans?.[a] ?? [0, 0];
    const [otherLeft, otherRight] = spans?.[b] ?? [0, 0];
    return !spans || (left < otherRight && otherLeft < right);
  };
  ends.forEach((end, index) => {
    if (Number.isNaN(end)) return;
    const touching = groups.filter((group) => group.some((other) => meets(index, other)));
    const merged = [...touching.flat(), index];
    for (const group of touching) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  });
  return groups;
}

/** A line over time as the corners it turns at: a rating holds until the next match, then steps. */
export function stepCorners(spots: readonly Spot[]): Spot[] {
  return spots.flatMap((spot, index) => {
    const before = spots[index - 1];
    return before ? [{ x: spot.x, y: before.y }, spot] : [spot];
  });
}
