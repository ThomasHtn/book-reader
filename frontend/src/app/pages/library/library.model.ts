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
