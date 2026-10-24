import { nextLocation, pageAt, pageCount, previousLocation, viewStart } from './page-math.utils';

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

  it('counts the gap between two facing pages with the page before it', () => {
    // Pages of 780 px parted by a 120 px gap: page 1 starts at 900.
    expect(pageAt(850, 900)).toBe(0);
    expect(pageAt(900, 900)).toBe(1);
  });
});

describe('pageCount', () => {
  it('counts the pages up to the one where the text ends, at least one', () => {
    expect(pageCount(12 * 1224, 1224)).toBe(12);
    expect(pageCount(12 * 1224 + 0.5, 1224)).toBe(12);
    expect(pageCount(11 * 1224 + 30, 1224)).toBe(12);
    expect(pageCount(0, 1224)).toBe(1);
  });

  it('counts facing pages by where the text ends, never the blank page beside it', () => {
    // Pages of 780 px parted by 120 px gaps: text ending on the third page, then on the first.
    expect(pageCount(2 * 900 + 780, 900)).toBe(3);
    expect(pageCount(500, 900)).toBe(1);
  });
});

describe('viewStart', () => {
  it('returns the page itself when one page is shown at a time', () => {
    expect(viewStart(5, 1)).toBe(5);
  });

  it('returns the left page of a pair of facing pages', () => {
    expect(viewStart(4, 2)).toBe(4);
    expect(viewStart(5, 2)).toBe(4);
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

  it('moves past both facing pages at once', () => {
    expect(nextLocation({ chapter: 1, page: 2 }, 5, 3, 2)).toEqual({ chapter: 1, page: 4 });
  });

  it('opens the next chapter when the facing pages show its last page', () => {
    // Pages 4 and 5 of a six-page chapter, or page 4 alone with an empty right page.
    expect(nextLocation({ chapter: 1, page: 4 }, 6, 3, 2)).toEqual({ chapter: 2, page: 0 });
    expect(nextLocation({ chapter: 1, page: 4 }, 5, 3, 2)).toEqual({ chapter: 2, page: 0 });
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

  it('moves back past both facing pages at once', () => {
    expect(previousLocation({ chapter: 1, page: 4 }, 2)).toEqual({ chapter: 1, page: 2 });
  });
});
