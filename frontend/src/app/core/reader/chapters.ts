import { Block } from '@core/http/api.model';

/** Longest chapter laid out at once; a book without headings is cut between paragraphs past it. */
export const MAX_CHAPTER_CHARS = 80_000;

/** A run of consecutive blocks laid out in its own multi-column container. */
export interface Chapter {
  readonly firstBlock: number;
  readonly blockCount: number;
}

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
