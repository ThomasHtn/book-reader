import { BookContent } from '@core/http/api.model';

import { chapterContent } from './chapter-layout';

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
