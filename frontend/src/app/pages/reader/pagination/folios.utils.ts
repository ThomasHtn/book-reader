import { bookPageNumber, bookPageTotal } from './page-count.utils';
import { Folios, PageLocation } from './pagination.model';

/**
 * Numbers the pages of a view over the whole book.
 *
 * @param counts - Page count of each chapter, measured or estimated.
 * @param location - Left page of the view.
 * @param chapterPages - Page count of the chapter shown.
 * @param perView - Pages shown side by side.
 * @returns Numbers of the left and right pages, and the total.
 */
export function foliosOf(
  counts: readonly number[],
  location: PageLocation,
  chapterPages: number,
  perView: number,
): Folios {
  const left = bookPageNumber(counts, location.chapter, location.page);
  // A chapter with an odd page count leaves the right page of its last view blank.
  const hasRight = perView > 1 && location.page + 1 < chapterPages;
  return { left, right: hasRight ? left + 1 : null, total: bookPageTotal(counts) };
}

/**
 * Words the folios for screen readers (spec 5.1).
 *
 * @param folios - Numbers of the pages shown.
 * @returns "Page 12 sur 840", or "Pages 12 et 13 sur 840" on facing pages.
 */
export function indicatorOf(folios: Folios): string {
  return folios.right === null
    ? `Page ${folios.left} sur ${folios.total}`
    : `Pages ${folios.left} et ${folios.right} sur ${folios.total}`;
}
