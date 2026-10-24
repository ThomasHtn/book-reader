import {
  bookFingerprint,
  layoutKey,
  parsePageCounts,
  serializePageCounts,
  shortHash,
} from './stored-page-counts.utils';

describe('layoutKey', () => {
  it('names a layout by typography, viewport size and font tier', () => {
    expect(layoutKey('t1', 800, 600, 32)).toBe('t1:800x600:32');
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

describe('bookFingerprint', () => {
  it('changes with the title, the author or the number of blocks, nothing else', () => {
    const book = { title: 'Le Horla', author: 'Guy de Maupassant', blocks: [] };
    const fingerprint = bookFingerprint(book);

    expect(bookFingerprint({ ...book })).toBe(fingerprint);
    expect(bookFingerprint({ ...book, title: 'Le Horla (1887)' })).not.toBe(fingerprint);
    expect(bookFingerprint({ ...book, author: 'Maupassant' })).not.toBe(fingerprint);
    expect(bookFingerprint({ ...book, blocks: [{ kind: 'paragraph', text: 'a' }] })).not.toBe(
      fingerprint,
    );
  });
});

describe('shortHash', () => {
  it('names the same text the same way, and another text another way', () => {
    expect(shortHash('.reading p { margin: 0 }')).toBe(shortHash('.reading p { margin: 0 }'));
    expect(shortHash('.reading p { margin: 0 }')).not.toBe(shortHash('.reading p { margin: 1px }'));
  });
});
