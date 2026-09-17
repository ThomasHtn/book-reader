/**
 * Binary search: first index in `[low, high)` where a monotonic predicate holds.
 *
 * @param low - First candidate index.
 * @param high - One past the last candidate index.
 * @param holds - Predicate, false then true over the range.
 * @returns First index where it holds, or `high` when it never does.
 */
export function lowerBound(low: number, high: number, holds: (index: number) => boolean): number {
  let start = low;
  let end = high;
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2);
    if (holds(middle)) {
      end = middle;
    } else {
      start = middle + 1;
    }
  }
  return start;
}
