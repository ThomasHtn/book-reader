import { EDGE_TOLERANCE_PX } from './pagination.constants';
import { PageLocation, PendingLocation } from './pagination.model';
/**
 * Returns the page holding a horizontal offset measured from the start of the chapter.
 *
 * @param left - Offset in CSS pixels.
 * @param pitch - Distance from one page to the next: page width plus the gap between pages.
 * @returns Zero-based page index.
 */
export function pageAt(left: number, pitch: number): number {
  return Math.max(0, Math.floor((left + EDGE_TOLERANCE_PX) / pitch));
}

/**
 * Returns the number of pages of a laid-out chapter.
 *
 * @param scrollWidth - Width of the multi-column content, plus one gap for the last page.
 * @param pitch - Distance from one page to the next: page width plus the gap between pages.
 * @returns Page count, at least one.
 */
export function pageCount(scrollWidth: number, pitch: number): number {
  return Math.max(1, Math.round(scrollWidth / pitch));
}

/**
 * Returns the left page of the view holding a page.
 *
 * @param page - Zero-based page in the chapter.
 * @param perView - Pages shown side by side.
 * @returns First page of its view.
 */
export function viewStart(page: number, perView: number): number {
  return page - (page % perView);
}

/**
 * Returns where "Suivant" leads.
 *
 * @param location - Current page.
 * @param chapterPages - Page count of the current chapter.
 * @param chapterCount - Number of chapters.
 * @param perView - Pages shown side by side, which a turn moves past at once.
 * @returns Next view, or `null` on the last view of the book.
 */
export function nextLocation(
  location: PageLocation,
  chapterPages: number,
  chapterCount: number,
  perView = 1,
): PageLocation | null {
  if (location.page + perView < chapterPages) {
    return { chapter: location.chapter, page: location.page + perView };
  }
  return location.chapter < chapterCount - 1 ? { chapter: location.chapter + 1, page: 0 } : null;
}

/**
 * Returns where "Précédent" leads.
 *
 * @param location - Current page.
 * @param perView - Pages shown side by side, which a turn moves past at once.
 * @returns Previous view, or `null` on the first page of the book.
 */
export function previousLocation(location: PageLocation, perView = 1): PendingLocation | null {
  if (location.page > 0) {
    return { chapter: location.chapter, page: Math.max(0, location.page - perView) };
  }
  return location.chapter > 0 ? { chapter: location.chapter - 1, page: 'last' } : null;
}
