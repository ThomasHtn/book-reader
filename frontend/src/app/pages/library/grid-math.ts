/**
 * Vertical box of one card inside the grid, measured from the top of the grid.
 */
export interface GridItem {
  /**
   * Top edge in CSS pixels, from the top of the grid.
   */
  readonly top: number;

  /**
   * Rendered height in CSS pixels; a long title makes its card taller.
   */
  readonly height: number;
}

/**
 * Where each page starts, and which page each card belongs to.
 */
export interface GridPages {
  /**
   * Vertical translation of the grid for each page, in CSS pixels; the first is 0.
   */
  readonly offsets: readonly number[];

  /**
   * Page index of each card, in list order.
   */
  readonly pages: readonly number[];
}

/**
 * Two cards belong to the same row when their tops agree within this many pixels.
 */
const ROW_TOLERANCE_PX = 1;

/**
 * Packs cards into pages of at most `viewportHeight` and at most `maxRowsPerPage` rows, never
 * splitting a row and never truncating a card: a row taller than the viewport gets a page of its
 * own rather than being cut.
 *
 * @param items - Cards in document order.
 * @param viewportHeight - Usable height of one page.
 * @param maxRowsPerPage - Row count above which a page breaks even if more would still fit.
 * @returns The scroll offset of every page and the page index of every card.
 */
export function paginateGrid(
  items: readonly GridItem[],
  viewportHeight: number,
  maxRowsPerPage = Infinity,
): GridPages {
  if (items.length === 0 || viewportHeight <= 0) {
    return { offsets: [0], pages: items.map(() => 0) };
  }

  const rows: {
    /**
     * Top edge shared by the cards of the row.
     */
    top: number;

    /**
     * Lowest bottom edge among its cards, since a long title makes a card taller.
     */
    bottom: number;

    /**
     * Indexes of its cards in `items`.
     */
    items: number[];
  }[] = [];
  items.forEach((item, index) => {
    const row = rows.at(-1);
    if (row && Math.abs(item.top - row.top) <= ROW_TOLERANCE_PX) {
      row.bottom = Math.max(row.bottom, item.top + item.height);
      row.items.push(index);
    } else {
      rows.push({ top: item.top, bottom: item.top + item.height, items: [index] });
    }
  });

  // Offsets are relative to the first row, not to 0: the grid may carry a top padding before it
  // (as it does in the library), and every page must keep that same margin, not just the first one.
  const firstTop = rows[0].top;
  // That margin sits on every page, so it comes out of the room left for rows.
  const room = viewportHeight - firstTop;
  let start = firstTop;
  const offsets = [0];
  const pages = items.map(() => 0);
  let page = 0;
  let rowsOnPage = 0;
  for (const row of rows) {
    // A row overflowing an empty page still goes on it: a page of its own rather than a cut card.
    const overflows = row.top > start && row.bottom - start > room;
    if (overflows || rowsOnPage >= maxRowsPerPage) {
      page += 1;
      start = row.top;
      rowsOnPage = 0;
      offsets.push(row.top - firstTop);
    }
    rowsOnPage += 1;
    for (const index of row.items) {
      pages[index] = page;
    }
  }
  return { offsets, pages };
}

/**
 * Returns the cards laid out on a page of "Mes livres".
 *
 * @param cardPages - Page of each card, in list order.
 * @param page - Displayed page.
 * @returns One-based first and last card, or `null` when the page holds none.
 */
export function visibleRange(
  cardPages: readonly number[],
  page: number,
): {
  /**
   * One-based position of the first card on the page.
   */
  first: number;

  /**
   * One-based position of the last card on the page.
   */
  last: number;
} | null {
  const first = cardPages.indexOf(page);
  return first < 0 ? null : { first: first + 1, last: cardPages.lastIndexOf(page) + 1 };
}
