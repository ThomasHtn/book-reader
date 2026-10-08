import { InjectionToken } from '@angular/core';

import { Block, BookContent } from '@core/http/api.model';
import { TextPosition } from '@core/reader/reading-progress';

import { Chapter } from './chapters';
import { DomChapterLayout } from './dom-chapter-layout';
import { PageGeometry } from './page-count';

/**
 * Blocks of one chapter, with the book's title page before the first and the end mark after the last.
 */
export interface ChapterContent {
  /**
   * Blocks of this chapter only.
   */
  readonly blocks: readonly Block[];

  /**
   * Book index of the first of them, to map positions back to the whole book.
   */
  readonly firstBlock: number;

  /**
   * Title page on the first chapter, before the text (spec 5.1); `null` on the others.
   */
  readonly titlePage: {
    /**
     * Book title, set in heading size.
     */
    readonly title: string;

    /**
     * Author line under the title, set in meta size.
     */
    readonly author: string;
  } | null;

  /**
   * Whether "Fin du livre" follows the last block (spec 4).
   */
  readonly endOfBook: boolean;
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

/**
 * Multi-column layout of one chapter; every DOM measurement of the reader lives behind it.
 */
export interface ChapterLayout {
  /**
   * Lays a chapter out.
   *
   * @returns Its page count.
   */
  render(content: ChapterContent): number;

  /**
   * Shifts the columns to show a page.
   */
  show(page: number): void;

  /**
   * Returns the page holding a position of the rendered chapter.
   */
  pageOf(position: TextPosition): number;

  /**
   * Returns the first character of a page of the rendered chapter.
   */
  positionOfPage(page: number): TextPosition;

  /**
   * Returns the page size and body font metrics that page count estimates run on.
   */
  geometry(): PageGeometry;
}

/**
 * Creates a layout over a viewport and its multi-column child.
 */
export type ChapterLayoutFactory = (viewport: HTMLElement, columns: HTMLElement) => ChapterLayout;

/**
 * Builds the reader's layout; a token so specs can inject a fake, since jsdom has no layout.
 */
export const CHAPTER_LAYOUT_FACTORY = new InjectionToken<ChapterLayoutFactory>(
  'CHAPTER_LAYOUT_FACTORY',
  {
    providedIn: 'root',
    factory: () => (viewport, columns) => new DomChapterLayout(viewport, columns),
  },
);
