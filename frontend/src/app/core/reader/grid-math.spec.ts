import { describe, expect, it } from 'vitest';
import { GridItem, paginateGrid, visibleRange } from './grid-math';

/** Builds `count` rows of `perRow` cards, each `height` tall, laid out from the top of the grid. */
function rows(count: number, perRow: number, height: number, gap = 0): GridItem[] {
  return Array.from({ length: count * perRow }, (_, index) => ({
    top: Math.floor(index / perRow) * (height + gap),
    height,
  }));
}

describe('paginateGrid', () => {
  it('keeps everything on one page when the grid fits', () => {
    expect(paginateGrid(rows(2, 3, 100), 400)).toEqual({
      offsets: [0],
      pages: [0, 0, 0, 0, 0, 0],
    });
  });

  it('breaks between rows, never inside one', () => {
    const { offsets, pages } = paginateGrid(rows(4, 3, 100), 250);

    expect(offsets).toEqual([0, 200]);
    expect(pages).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('counts the gap between rows as part of the page', () => {
    const { offsets, pages } = paginateGrid(rows(3, 3, 100, 24), 250);

    expect(offsets).toEqual([0, 248]);
    expect(pages).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1]);
  });

  it('sizes a row on its tallest card, so a long title never gets cut', () => {
    const items: GridItem[] = [
      { top: 0, height: 100 },
      { top: 0, height: 180 },
      { top: 200, height: 100 },
    ];

    expect(paginateGrid(items, 250)).toEqual({ offsets: [0, 200], pages: [0, 0, 1] });
  });

  it('gives a page of its own to a row taller than the viewport', () => {
    const items: GridItem[] = [
      { top: 0, height: 100 },
      { top: 100, height: 400 },
    ];

    expect(paginateGrid(items, 250)).toEqual({ offsets: [0, 100], pages: [0, 1] });
  });

  it('keeps every page at the same margin when the grid carries a top padding', () => {
    // Real measurements include the grid's padding-top, so the first row never starts at 0.
    const items: GridItem[] = rows(4, 3, 100, 24).map((item) => ({ ...item, top: item.top + 24 }));

    const { offsets } = paginateGrid(items, 250);

    expect(offsets).toEqual([0, 248]);
  });

  it('counts the top padding against the page height, so the last row is never cut', () => {
    // 24 of padding + 100 + 24 + 100 = 248 overflows a 240 viewport by 8.
    const items: GridItem[] = rows(2, 3, 100, 24).map((item) => ({ ...item, top: item.top + 24 }));

    const { offsets, pages } = paginateGrid(items, 240);

    expect(offsets).toEqual([0, 124]);
    expect(pages).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('breaks after the row cap even when more rows would still fit the viewport', () => {
    const { offsets, pages } = paginateGrid(rows(4, 3, 100), 1000, 2);

    expect(offsets).toEqual([0, 200]);
    expect(pages).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('answers one empty page when there is nothing to lay out or nothing to lay out in', () => {
    expect(paginateGrid([], 400)).toEqual({ offsets: [0], pages: [] });
    expect(paginateGrid(rows(2, 3, 100), 0)).toEqual({
      offsets: [0],
      pages: [0, 0, 0, 0, 0, 0],
    });
  });
});

describe('visibleRange', () => {
  it('returns the one-based range of cards laid out on a page', () => {
    const cardPages = [0, 0, 0, 1, 1, 2];
    expect(visibleRange(cardPages, 0)).toEqual({ first: 1, last: 3 });
    expect(visibleRange(cardPages, 1)).toEqual({ first: 4, last: 5 });
    expect(visibleRange(cardPages, 2)).toEqual({ first: 6, last: 6 });
  });

  it('returns nothing for a page without cards', () => {
    expect(visibleRange([], 0)).toBeNull();
    expect(visibleRange([0, 0], 3)).toBeNull();
  });
});
