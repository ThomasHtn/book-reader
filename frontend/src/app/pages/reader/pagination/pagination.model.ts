import { Block } from '@core/http/api.model';
import { TextPosition } from '@core/reader/reader.model';

/**
 * A run of consecutive blocks laid out in its own multi-column container.
 */
export interface Chapter {
  /**
   * Book index of its first block.
   */
  readonly firstBlock: number;

  /**
   * Number of blocks, at least one.
   */
  readonly blockCount: number;
}

/**
 * What a page holds, read once from the rendered chapter.
 */
export interface PageGeometry {
  /**
   * Column width in CSS pixels.
   */
  readonly width: number;
  /**
   * Column height in CSS pixels.
   */
  readonly height: number;
  /**
   * Body font size in CSS pixels.
   */
  readonly fontSize: number;
  /**
   * Advance of one character of body text.
   */
  readonly charWidth: (char: string) => number;
  /**
   * Advance of one character at body size in the heading weight.
   */
  readonly boldCharWidth: (char: string) => number;
}

/**
 * What `estimatePageCounts` lays out besides chapters: the title page and the end mark.
 */
export interface BookText {
  /**
   * Title shown on the first chapter's title page.
   */
  readonly title: string;

  /**
   * Author line under the title.
   */
  readonly author: string;

  /**
   * Every block of the book; chapters index into it.
   */
  readonly blocks: readonly Block[];
}

/**
 * A page of the book: a column of one chapter. Two pages side by side share a view, the left one
 * standing for it.
 */
export interface PageLocation {
  /**
   * Zero-based chapter index.
   */
  readonly chapter: number;

  /**
   * Zero-based page within the chapter.
   */
  readonly page: number;
}

/**
 * Target of a command, before the destination chapter is laid out: `last` is resolved once it is.
 */
export interface PendingLocation {
  /**
   * Zero-based chapter index.
   */
  readonly chapter: number;

  /**
   * Zero-based page, or `last` while the chapter's page count is unknown.
   */
  readonly page: number | 'last';
}

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

  /**
   * Returns a fingerprint of everything in the styles that decides how much a page holds, so counts
   * measured under other styles are forgotten without anyone raising a version by hand.
   */
  typography(): string;

  /**
   * Returns how many pages the rendered chapter shows side by side: two on a wide screen, else one.
   */
  pagesPerView(): number;
}

/**
 * Creates a layout over a viewport and its multi-column child.
 */
export type ChapterLayoutFactory = (viewport: HTMLElement, columns: HTMLElement) => ChapterLayout;

/**
 * Page numbers under the view: the left page's, and the right page's when two pages face each other.
 */
export interface Folios {
  /**
   * Number of the left page, or of the only page, in the whole book.
   */
  readonly left: number;

  /**
   * Number of the right page, `null` when one page is shown or the right page is blank.
   */
  readonly right: number | null;

  /**
   * Page count of the whole book.
   */
  readonly total: number;
}

/**
 * Layout the page counts belong to (spec 5.2).
 */
export interface LayoutKey {
  /**
   * Typography, viewport size and font tier, as `layoutKey` names them.
   */
  readonly value: string;

  /**
   * Whether counts are read and stored under it: not before the font tier is known.
   */
  readonly persisted: boolean;
}
