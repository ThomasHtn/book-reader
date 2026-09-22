/** Vertical box of one card inside the grid, measured from the top of the grid. */
export interface GridItem {
  readonly top: number;
  readonly height: number;
}

/** Where each page starts, and which page each card belongs to. */
export interface GridPages {
  readonly offsets: readonly number[];
  readonly pages: readonly number[];
}

/** Two cards belong to the same row when their tops agree within this many pixels. */
const ROW_TOLERANCE_PX = 1;

/**
 * Packs cards into pages of at most `viewportHeight`, never splitting a row and never truncating a
 * card: a row taller than the viewport gets a page of its own rather than being cut.
 *
 * @param items - Cards in document order.
 * @param viewportHeight - Usable height of one page.
 * @returns The scroll offset of every page and the page index of every card.
 */
export function paginateGrid(items: readonly GridItem[], viewportHeight: number): GridPages {
  if (items.length === 0 || viewportHeight <= 0) {
    return { offsets: [0], pages: items.map(() => 0) };
  }

  const rows: { top: number; bottom: number; items: number[] }[] = [];
  items.forEach((item, index) => {
    const row = rows.at(-1);
    if (row && Math.abs(item.top - row.top) <= ROW_TOLERANCE_PX) {
      row.bottom = Math.max(row.bottom, item.top + item.height);
      row.items.push(index);
    } else {
      rows.push({ top: item.top, bottom: item.top + item.height, items: [index] });
    }
  });

  const offsets = [0];
  const pages = items.map(() => 0);
  let page = 0;
  for (const row of rows) {
    const start = offsets[page];
    if (row.top > start && row.bottom - start > viewportHeight) {
      page += 1;
      offsets.push(row.top);
    }
    for (const index of row.items) {
      pages[index] = page;
    }
  }
  return { offsets, pages };
}
