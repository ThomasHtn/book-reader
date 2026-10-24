import { Block, BookContent } from '@core/http/api.model';
import { TextPosition } from '@core/reader/reader.model';

import { MAX_CHAPTER_CHARS } from './pagination.constants';
import { Chapter, ChapterContent } from './pagination.model';

/**
 * Splits a book into chapters: one per heading, cut between paragraphs past `maxChars`.
 *
 * @param blocks - Blocks of the book.
 * @param maxChars - Character count past which a chapter is cut.
 * @returns Chapters covering every block, in order.
 */
export function splitIntoChapters(
  blocks: readonly Block[],
  maxChars: number = MAX_CHAPTER_CHARS,
): Chapter[] {
  const chapters: Chapter[] = [];
  let firstBlock = 0;
  let chars = 0;
  blocks.forEach((block, index) => {
    // Cut before a heading or past the size limit, never before the chapter's first block.
    const startsChapter =
      index > firstBlock && (block.kind === 'heading' || chars + block.text.length > maxChars);
    if (startsChapter) {
      chapters.push({ firstBlock, blockCount: index - firstBlock });
      firstBlock = index;
      chars = 0;
    }
    chars += block.text.length;
  });
  if (blocks.length > 0) {
    chapters.push({ firstBlock, blockCount: blocks.length - firstBlock });
  }
  return chapters;
}

/**
 * Finds the chapter holding a block.
 *
 * @param chapters - Chapters of the book.
 * @param blockIndex - Index of a block of the book.
 * @returns Index of the chapter.
 */
export function chapterOfBlock(chapters: readonly Chapter[], blockIndex: number): number {
  const index = chapters.findIndex(
    (chapter) => blockIndex < chapter.firstBlock + chapter.blockCount,
  );
  return index < 0 ? chapters.length - 1 : index;
}

/**
 * Tells whether a position is the very start of a chapter.
 *
 * @param chapter - Chapter of the book.
 * @param position - Position in the book.
 * @returns `true` on the first character of the chapter's first block.
 */
export function isChapterStart(chapter: Chapter, position: TextPosition): boolean {
  return position.blockIndex === chapter.firstBlock && position.charOffset === 0;
}

/**
 * Cuts the content of one chapter out of a book.
 *
 * @param book - Book being read.
 * @param chapters - Chapters of the book.
 * @param index - Index of the chapter.
 * @returns Its blocks, with the title page on the first chapter and the end mark on the last.
 */
export function chapterContent(
  book: BookContent,
  chapters: readonly Chapter[],
  index: number,
): ChapterContent {
  const { firstBlock, blockCount } = chapters[index];
  return {
    blocks: book.blocks.slice(firstBlock, firstBlock + blockCount),
    firstBlock,
    titlePage: index === 0 ? { title: book.title, author: book.author } : null,
    endOfBook: index === chapters.length - 1,
  };
}
