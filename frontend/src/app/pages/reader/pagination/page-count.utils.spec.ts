import { Block } from '@core/http/api.model';

import { bookPageNumber, bookPageTotal, estimatePageCounts } from './page-count.utils';
import { Chapter, PageGeometry } from './pagination.model';

/**
 * Builds a paragraph block.
 */
const paragraph = (text: string): Block => ({ kind: 'paragraph', text });

/**
 * Ten characters per line; body lines are 15.5 px high, paragraphs indented 15 px, with no gap.
 */
const geometry = (height: number): PageGeometry => ({
  width: 100,
  height,
  fontSize: 10,
  charWidth: () => 10,
  boldCharWidth: () => 10,
});

/**
 * Estimates the middle chapter of three, away from the title page and the end mark.
 */
function middleChapterPages(
  blocks: Block[],
  height: number,
  metrics: Partial<PageGeometry> = {},
): number {
  const book = { title: 'T', author: 'A', blocks: [paragraph('a'), ...blocks, paragraph('z')] };
  const chapters: Chapter[] = [
    { firstBlock: 0, blockCount: 1 },
    { firstBlock: 1, blockCount: blocks.length },
    { firstBlock: blocks.length + 1, blockCount: 1 },
  ];
  return estimatePageCounts(book, chapters, [], { ...geometry(height), ...metrics })[1];
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

  it('gives each short paragraph a whole line, with no gap between paragraphs', () => {
    // Four one-line paragraphs fill 62 px; the fifth opens a second page.
    expect(
      middleChapterPages(
        Array.from({ length: 6 }, () => paragraph('oui')),
        62,
      ),
    ).toBe(2);
  });

  it('breaks lines between words and splits a paragraph across pages', () => {
    // Two four-letter words per line: ten lines, four per 62 px page.
    expect(middleChapterPages([paragraph(Array(20).fill('abcd').join(' '))], 62)).toBe(3);
  });

  it('hyphenates a long word that does not fit at the end of a line', () => {
    // "ab abcdef-" then "ghi ab": two lines, which fit on one 31 px page.
    expect(middleChapterPages([paragraph('ab abcdefghi ab')], 31)).toBe(1);
  });

  it('indents a paragraph that follows another one, never the first of a chapter', () => {
    // "abcd abcd" fills 90 px of 100: one line unindented, two once indented 15 px. Five lines in all
    // need two 46.5 px pages, where three unindented lines would fit on one.
    const paragraphs = Array.from({ length: 3 }, () => paragraph('abcd abcd'));

    expect(middleChapterPages(paragraphs, 46.5)).toBe(2);
  });

  it('never leaves a single line at the foot of a page', () => {
    // The indented paragraph runs to three lines; one would fit under "oui", but a line alone is
    // pushed on, and the three lines then split two and one.
    expect(middleChapterPages([paragraph('oui'), paragraph('abcd abcd abcd abcd')], 31)).toBe(3);
  });

  it('measures headings in their bold weight', () => {
    // "abcd" fits one 66 px heading line in the regular weight but takes two in bold, which pushes
    // the paragraph after it to the next page.
    const blocks: Block[] = [{ kind: 'heading', text: 'abcd' }, paragraph('oui')];

    expect(middleChapterPages(blocks, 60)).toBe(1);
    expect(middleChapterPages(blocks, 60, { boldCharWidth: () => 20 })).toBe(2);
  });

  it('never sets the author line and the end mark under 16 px, as `--text-meta` does', () => {
    // At a 10 px body they take 24.8 px lines rather than 9.3 px ones, so the text no longer fits.
    const book = { title: 'T', author: 'A', blocks: [paragraph('oui')] };

    expect(estimatePageCounts(book, [{ firstBlock: 0, blockCount: 1 }], [], geometry(80))).toEqual([
      2,
    ]);
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
