import { Block, BookContent } from '@core/http/api.model';

import {
  chapterContent,
  chapterOfBlock,
  isChapterStart,
  splitIntoChapters,
} from './chapters.utils';

/**
 * Builds a heading block.
 */
const heading = (text: string): Block => ({ kind: 'heading', text });

/**
 * Builds a paragraph block.
 */
const paragraph = (text: string): Block => ({ kind: 'paragraph', text });

describe('splitIntoChapters', () => {
  it('starts a chapter at every heading, keeping the blocks before the first one together', () => {
    const blocks = [
      paragraph('Préface'),
      heading('I'),
      paragraph('a'),
      paragraph('b'),
      heading('II'),
      paragraph('c'),
    ];

    expect(splitIntoChapters(blocks)).toEqual([
      { firstBlock: 0, blockCount: 1 },
      { firstBlock: 1, blockCount: 3 },
      { firstBlock: 4, blockCount: 2 },
    ]);
  });

  it('does not open an empty chapter when the book starts with a heading', () => {
    expect(splitIntoChapters([heading('I'), paragraph('a')])).toEqual([
      { firstBlock: 0, blockCount: 2 },
    ]);
  });

  it('cuts a chapter between paragraphs once it exceeds the character limit', () => {
    const blocks = [
      heading('I'),
      paragraph('x'.repeat(40)),
      paragraph('y'.repeat(40)),
      paragraph('z'.repeat(40)),
    ];

    expect(splitIntoChapters(blocks, 60)).toEqual([
      { firstBlock: 0, blockCount: 2 },
      { firstBlock: 2, blockCount: 1 },
      { firstBlock: 3, blockCount: 1 },
    ]);
  });

  it('keeps a single oversized paragraph whole', () => {
    expect(splitIntoChapters([paragraph('x'.repeat(100))], 60)).toEqual([
      { firstBlock: 0, blockCount: 1 },
    ]);
  });

  it('returns no chapter for an empty book', () => {
    expect(splitIntoChapters([])).toEqual([]);
  });
});

describe('chapterOfBlock', () => {
  /**
   * Three chapters: block 0, blocks 1-3, blocks 4-5.
   */
  const chapters = [
    { firstBlock: 0, blockCount: 1 },
    { firstBlock: 1, blockCount: 3 },
    { firstBlock: 4, blockCount: 2 },
  ];

  it('finds the chapter holding a block', () => {
    expect(chapterOfBlock(chapters, 0)).toBe(0);
    expect(chapterOfBlock(chapters, 3)).toBe(1);
    expect(chapterOfBlock(chapters, 5)).toBe(2);
  });
});

describe('isChapterStart', () => {
  /**
   * Chapter of blocks 4 and 5.
   */
  const chapter = { firstBlock: 4, blockCount: 2 };

  it('holds on the first character of the first block only', () => {
    expect(isChapterStart(chapter, { blockIndex: 4, charOffset: 0 })).toBe(true);
    expect(isChapterStart(chapter, { blockIndex: 4, charOffset: 1 })).toBe(false);
    expect(isChapterStart(chapter, { blockIndex: 5, charOffset: 0 })).toBe(false);
  });
});

/**
 * Two chapters: a heading and its paragraph, then a lone heading.
 */
const BOOK: BookContent = {
  id: 'b1',
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  blocks: [
    { kind: 'heading', text: 'I' },
    { kind: 'paragraph', text: 'a' },
    { kind: 'heading', text: 'II' },
  ],
  finishedAt: null,
};

/**
 * Chapters of BOOK.
 */
const CHAPTERS = [
  { firstBlock: 0, blockCount: 2 },
  { firstBlock: 2, blockCount: 1 },
];

describe('chapterContent', () => {
  it('puts the title page before the first chapter', () => {
    expect(chapterContent(BOOK, CHAPTERS, 0)).toEqual({
      blocks: BOOK.blocks.slice(0, 2),
      firstBlock: 0,
      titlePage: { title: 'Le Horla', author: 'Guy de Maupassant' },
      endOfBook: false,
    });
  });

  it('puts the end mark after the last chapter', () => {
    expect(chapterContent(BOOK, CHAPTERS, 1)).toEqual({
      blocks: BOOK.blocks.slice(2),
      firstBlock: 2,
      titlePage: null,
      endOfBook: true,
    });
  });
});
