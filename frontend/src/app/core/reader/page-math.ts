/** A page of the book: a column of one chapter. `last` is resolved once the chapter is laid out. */
export interface Location {
  readonly chapter: number;
  readonly page: number;
}

/** Target of a command, before the destination chapter is laid out. */
export interface PendingLocation {
  readonly chapter: number;
  readonly page: number | 'last';
}

/** Tolerance for sub-pixel layout rounding at column edges. */
const EDGE_TOLERANCE_PX = 0.5;

/**
 * Returns the page holding a horizontal offset measured from the start of the chapter.
 *
 * @param left - Offset in CSS pixels.
 * @param columnWidth - Width of one page.
 * @returns Zero-based page index.
 */
export function pageAt(left: number, columnWidth: number): number {
  return Math.max(0, Math.floor((left + EDGE_TOLERANCE_PX) / columnWidth));
}

/**
 * Returns the number of pages of a laid-out chapter.
 *
 * @param scrollWidth - Width of the multi-column content.
 * @param columnWidth - Width of one page.
 * @returns Page count, at least one.
 */
export function pageCount(scrollWidth: number, columnWidth: number): number {
  return Math.max(1, Math.round(scrollWidth / columnWidth));
}

/**
 * Returns the one-based page number in the whole book.
 *
 * @param counts - Page count of each chapter, `undefined` while not counted yet.
 * @param chapter - Current chapter.
 * @param page - Zero-based page in the current chapter.
 * @returns Page number, or `undefined` while a previous chapter is not counted.
 */
export function bookPageNumber(
  counts: readonly (number | undefined)[],
  chapter: number,
  page: number,
): number | undefined {
  let previous = 0;
  for (let index = 0; index < chapter; index++) {
    const count = counts[index];
    if (count === undefined) {
      return undefined;
    }
    previous += count;
  }
  return previous + page + 1;
}

/**
 * Returns the page count of the whole book.
 *
 * @param counts - Page count of each chapter.
 * @returns Total, or `undefined` while a chapter is not counted.
 */
export function bookPageTotal(counts: readonly (number | undefined)[]): number | undefined {
  return counts.every((count) => count !== undefined)
    ? counts.reduce<number>((total, count) => total + count, 0)
    : undefined;
}

/**
 * Returns where "Suivant" leads.
 *
 * @param location - Current page.
 * @param chapterPages - Page count of the current chapter.
 * @param chapterCount - Number of chapters.
 * @returns Next page, or `null` on the last page of the book.
 */
export function nextLocation(
  location: Location,
  chapterPages: number,
  chapterCount: number,
): Location | null {
  if (location.page < chapterPages - 1) {
    return { chapter: location.chapter, page: location.page + 1 };
  }
  return location.chapter < chapterCount - 1 ? { chapter: location.chapter + 1, page: 0 } : null;
}

/**
 * Returns where "Précédent" leads.
 *
 * @param location - Current page.
 * @returns Previous page, or `null` on the first page of the book.
 */
export function previousLocation(location: Location): PendingLocation | null {
  if (location.page > 0) {
    return { chapter: location.chapter, page: location.page - 1 };
  }
  return location.chapter > 0 ? { chapter: location.chapter - 1, page: 'last' } : null;
}

/**
 * Returns the rows laid out on a page of "Mes livres".
 *
 * @param rowPages - Page of each row, in list order.
 * @param page - Displayed page.
 * @returns One-based first and last row, or `null` when the page holds none.
 */
export function visibleRange(
  rowPages: readonly number[],
  page: number,
): { first: number; last: number } | null {
  const first = rowPages.indexOf(page);
  return first < 0 ? null : { first: first + 1, last: rowPages.lastIndexOf(page) + 1 };
}
