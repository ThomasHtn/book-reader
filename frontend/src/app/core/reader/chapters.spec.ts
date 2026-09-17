import { Block } from '@core/http/api.model';
import { chapterOfBlock, splitIntoChapters } from './chapters';

const heading = (text: string): Block => ({ kind: 'heading', text });
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
