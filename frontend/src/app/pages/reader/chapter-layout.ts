import { InjectionToken } from '@angular/core';
import { Block } from '@core/http/api.model';
import { TextPosition } from '@core/reader/reading-progress';
import { DomChapterLayout } from './dom-chapter-layout';

/** Blocks of one chapter, with the book's title page before the first and the end mark after the last. */
export interface ChapterContent {
  readonly blocks: readonly Block[];
  readonly firstBlock: number;
  readonly titlePage: { readonly title: string; readonly author: string } | null;
  readonly endOfBook: boolean;
}

/** Multi-column layout of one chapter; every DOM measurement of the reader lives behind it. */
export interface ChapterLayout {
  /**
   * Lays a chapter out.
   *
   * @returns Its page count.
   */
  render(content: ChapterContent): number;

  /** Shifts the columns to show a page. */
  show(page: number): void;

  /** Returns the page holding a position of the rendered chapter. */
  pageOf(position: TextPosition): number;

  /** Returns the first character of a page of the rendered chapter. */
  positionOfPage(page: number): TextPosition;
}

/** Creates a layout over a viewport and its multi-column child. */
export type ChapterLayoutFactory = (viewport: HTMLElement, columns: HTMLElement) => ChapterLayout;

export const CHAPTER_LAYOUT_FACTORY = new InjectionToken<ChapterLayoutFactory>(
  'CHAPTER_LAYOUT_FACTORY',
  {
    providedIn: 'root',
    factory: () => (viewport, columns) => new DomChapterLayout(viewport, columns),
  },
);
