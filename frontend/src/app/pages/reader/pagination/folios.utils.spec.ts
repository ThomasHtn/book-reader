import { foliosOf, indicatorOf } from './folios.utils';

describe('foliosOf', () => {
  it('numbers a single page over the whole book', () => {
    expect(foliosOf([3, 2], { chapter: 1, page: 1 }, 2, 1)).toEqual({
      left: 5,
      right: null,
      total: 5,
    });
  });

  it('numbers both facing pages', () => {
    expect(foliosOf([4, 2], { chapter: 0, page: 2 }, 4, 2)).toEqual({
      left: 3,
      right: 4,
      total: 6,
    });
  });

  it('leaves the right page unnumbered when the chapter ends on the left one', () => {
    expect(foliosOf([3, 2], { chapter: 0, page: 2 }, 3, 2).right).toBeNull();
  });
});

describe('indicatorOf', () => {
  it('reads one page or two facing pages', () => {
    expect(indicatorOf({ left: 12, right: null, total: 840 })).toBe('Page 12 sur 840');
    expect(indicatorOf({ left: 12, right: 13, total: 840 })).toBe('Pages 12 et 13 sur 840');
  });
});
