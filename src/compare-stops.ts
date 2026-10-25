/** One place the cursor can stop on a compare chart: the time or match number, and each player's point there. */
export interface Stop {
  /** The time, or the match number, this stop is at. */
  readonly at: number;
  /** Each player's point index here (-1: none yet), and whether that match is the stop's own. */
  readonly index: readonly number[];
  readonly own: readonly boolean[];
}

interface Timed {
  readonly points: readonly { readonly at?: number | string }[];
}

/** A point's time in milliseconds, or NaN without one. */
export const timeOf = (point: { readonly at?: number | string }): number =>
  typeof point.at === "string" ? Date.parse(point.at) : (point.at ?? Number.NaN);

/** The place of a point on the x axis: its time, or its number in the player's matches. */
export const placeOf = (
  point: { readonly at?: number | string },
  index: number,
  byTime: boolean,
) => (byTime ? timeOf(point) : index);

/**
 * The stops, left to right. Over time there's one for every moment a player has a match, and a
 * player's rating holds from their last match before it. By match, the nth match of every player
 * who has one.
 */
export function compareStops(series: readonly Timed[], byTime: boolean): Stop[] {
  const keys = series.flatMap(({ points }) => points.map((point, i) => placeOf(point, i, byTime)));
  return [...new Set(keys)]
    .sort((a, b) => a - b)
    .map((at) => {
      const index = series.map(({ points }) =>
        byTime
          ? points.findLastIndex((point) => timeOf(point) <= at)
          : at < points.length
            ? at
            : -1,
      );
      const own = series.map(({ points }, n) => {
        const point = points[index[n] ?? -1];
        return point !== undefined && placeOf(point, index[n] ?? 0, byTime) === at;
      });
      return { at, index, own };
    });
}
