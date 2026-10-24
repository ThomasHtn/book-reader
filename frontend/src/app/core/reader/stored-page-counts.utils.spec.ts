import { layoutKey, parsePageCounts, serializePageCounts } from './stored-page-counts.utils';

describe('layoutKey', () => {
  it('names a layout by typography version, viewport size and font tier', () => {
    expect(layoutKey(800, 600, 32)).toBe('v2:800x600:32');
  });
});

describe('parsePageCounts and serializePageCounts', () => {
  it('round-trips the counts measured for a layout', () => {
    const raw = serializePageCounts('800x600:100', [3, undefined, 7]);

    expect(parsePageCounts(raw, '800x600:100', 3)).toEqual([3, undefined, 7]);
  });

  it('forgets counts of another layout, another chapter split or a corrupt entry', () => {
    const raw = serializePageCounts('800x600:100', [3, undefined, 7]);

    expect(parsePageCounts(raw, '800x600:140', 3)).toEqual([undefined, undefined, undefined]);
    expect(parsePageCounts(raw, '800x600:100', 2)).toEqual([undefined, undefined]);
    expect(parsePageCounts('{', '800x600:100', 1)).toEqual([undefined]);
    expect(parsePageCounts('{"layout":"a","counts":[-1]}', 'a', 1)).toEqual([undefined]);
    expect(parsePageCounts(null, 'a', 1)).toEqual([undefined]);
  });
});
