import { nextLocation, pageAt, pageCount, previousLocation, visibleRange } from './page-math';

describe('pageAt', () => {
  it('returns the column holding a horizontal offset from the start of the chapter', () => {
    expect(pageAt(0, 1224)).toBe(0);
    expect(pageAt(1223, 1224)).toBe(0);
    expect(pageAt(1224, 1224)).toBe(1);
    expect(pageAt(5 * 1224 + 12, 1224)).toBe(5);
  });

  it('absorbs sub-pixel rounding just before a column edge', () => {
    expect(pageAt(2 * 1224 - 0.4, 1224)).toBe(2);
  });

  it('never returns a negative page', () => {
    expect(pageAt(-3, 1224)).toBe(0);
  });
});

describe('pageCount', () => {
  it('divides the content width by the column width, at least one page', () => {
    expect(pageCount(12 * 1224, 1224)).toBe(12);
    expect(pageCount(12 * 1224 + 0.5, 1224)).toBe(12);
    expect(pageCount(0, 1224)).toBe(1);
  });
});

describe('nextLocation', () => {
  it('turns the page inside a chapter', () => {
    expect(nextLocation({ chapter: 1, page: 2 }, 5, 3)).toEqual({ chapter: 1, page: 3 });
  });

  it('opens the next chapter on its first page after the last page', () => {
    expect(nextLocation({ chapter: 1, page: 4 }, 5, 3)).toEqual({ chapter: 2, page: 0 });
  });

  it('stays put on the last page of the book', () => {
    expect(nextLocation({ chapter: 2, page: 4 }, 5, 3)).toBeNull();
  });
});

describe('previousLocation', () => {
  it('turns back inside a chapter', () => {
    expect(previousLocation({ chapter: 1, page: 2 })).toEqual({ chapter: 1, page: 1 });
  });

  it('opens the previous chapter on its last page, known only once laid out', () => {
    expect(previousLocation({ chapter: 1, page: 0 })).toEqual({ chapter: 0, page: 'last' });
  });

  it('stays put on the first page of the book', () => {
    expect(previousLocation({ chapter: 0, page: 0 })).toBeNull();
  });
});

describe('visibleRange', () => {
  it('returns the one-based range of rows laid out on a page', () => {
    const rowPages = [0, 0, 0, 1, 1, 2];
    expect(visibleRange(rowPages, 0)).toEqual({ first: 1, last: 3 });
    expect(visibleRange(rowPages, 1)).toEqual({ first: 4, last: 5 });
    expect(visibleRange(rowPages, 2)).toEqual({ first: 6, last: 6 });
  });

  it('returns nothing for a page without rows', () => {
    expect(visibleRange([], 0)).toBeNull();
    expect(visibleRange([0, 0], 3)).toBeNull();
  });
});
