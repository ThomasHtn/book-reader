import { InjectionToken } from '@angular/core';

import { DomChapterLayout } from './dom-chapter-layout';
import { ChapterLayoutFactory } from './pagination.model';

/**
 * Longest chapter laid out at once; a book without headings is cut between paragraphs past it.
 */
export const MAX_CHAPTER_CHARS = 80_000;

/**
 * Line shown after the last block of a book, also laid out by the reader.
 */
export const END_MARK = 'Fin du livre';

/**
 * Tolerance for sub-pixel layout rounding at column edges.
 */
export const EDGE_TOLERANCE_PX = 0.5;

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
