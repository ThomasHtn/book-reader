import { Block } from '@core/http/api.model';
import { Chapter } from './chapters';
import {
  PageGeometry,
  bookPageNumber,
  bookPageTotal,
  estimatePageCounts,
  parsePageCounts,
  serializePageCounts,
} from './page-count';

const paragraph = (text: string): Block => ({ kind: 'paragraph', text });

/** Ten characters per line; body lines are 14 px high with a 6 px paragraph gap. */
const geometry = (height: number): PageGeometry => ({
  width: 100,
  height,
  fontSize: 10,
  charWidth: () => 10,
});

/** Estimates the middle chapter of three, away from the title page and the end mark. */
function middleChapterPages(blocks: Block[], height: number): number {
  const book = { title: 'T', author: 'A', blocks: [paragraph('a'), ...blocks, paragraph('z')] };
  const chapters: Chapter[] = [
    { firstBlock: 0, blockCount: 1 },
    { firstBlock: 1, blockCount: blocks.length },
    { firstBlock: blocks.length + 1, blockCount: 1 },
  ];
  return estimatePageCounts(book, chapters, [], geometry(height))[1];
}

describe('estimatePageCounts', () => {
  it('keeps the counts measured on a real layout', () => {
    const book = { title: 'T', author: 'A', blocks: [paragraph('a'), paragraph('b')] };
    const chapters: Chapter[] = [
      { firstBlock: 0, blockCount: 1 },
      { firstBlock: 1, blockCount: 1 },
    ];

    expect(estimatePageCounts(book, chapters, [7, undefined], geometry(100))).toEqual([7, 1]);
  });

  it('gives each short paragraph a whole line and its gap', () => {
    // Three one-line paragraphs fill 60 px; the fourth opens a second page.
    expect(
      middleChapterPages(
        Array.from({ length: 6 }, () => paragraph('oui')),
        60,
      ),
    ).toBe(2);
  });

  it('breaks lines between words and splits a paragraph across pages', () => {
    // Two four-letter words per line: ten lines, four per 60 px page.
    expect(middleChapterPages([paragraph(Array(20).fill('abcd').join(' '))], 60)).toBe(3);
  });

  it('hyphenates a long word that does not fit at the end of a line', () => {
    // "ab abcdef-" then "ghi ab": two lines, which fit on one 30 px page.
    expect(middleChapterPages([paragraph('ab abcdefghi ab')], 30)).toBe(1);
  });

  it('never leaves a single line at the foot of a page', () => {
    // One line would fit under the first paragraph, but a line alone is pushed to the next page.
    expect(middleChapterPages([paragraph('oui'), paragraph('abcd abcd abcd abcd')], 40)).toBe(2);
  });
});

describe('bookPageNumber and bookPageTotal', () => {
  it('number pages across chapters, one-based', () => {
    expect(bookPageNumber([3, 2, 5], 0, 0)).toBe(1);
    expect(bookPageNumber([3, 2, 5], 1, 1)).toBe(5);
    expect(bookPageNumber([3, 2, 5], 2, 4)).toBe(10);
    expect(bookPageTotal([3, 2, 5])).toBe(10);
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
