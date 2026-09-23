import { Block } from '@core/http/api.model';
import { Chapter } from './chapters';

/** Page count of each chapter; `undefined` for a chapter not laid out yet under the current layout. */
export type MeasuredCounts = readonly (number | undefined)[];

/** What a page holds, read once from the rendered chapter. */
export interface PageGeometry {
  /** Column width in CSS pixels. */
  readonly width: number;
  /** Column height in CSS pixels. */
  readonly height: number;
  /** Body font size in CSS pixels. */
  readonly fontSize: number;
  /** Advance of one character of body text. */
  readonly charWidth: (char: string) => number;
}

/** What `estimatePageCounts` lays out besides chapters: the title page and the end mark. */
export interface BookText {
  readonly title: string;
  readonly author: string;
  readonly blocks: readonly Block[];
}

// Mirrors of tokens.css and styles.css (`.reading`): leading, heading scale, paragraph gap, meta size.
const LEADING_BODY = 1.4;
const HEADING_SCALE = 1.15;
const LEADING_TIGHT = 1.15;
const GAP_EM = 0.6;
const META_SCALE = 0.5;

/** Line shown after the last block of a book, also laid out by the reader. */
export const END_MARK = 'Fin du livre';

// Column breaks as observed in Blink on real books (2026-09-23): two lines at least on each side,
// except a three-line paragraph, split two and one rather than leaving two empty lines.
const ORPHANS = 2;
const WIDOWS = 2;

// French `hyphens: auto`, approximated: a word of seven letters or more splits, three on each side.
const HYPHEN_MIN_WORD = 7;
const HYPHEN_MIN_SIDE = 3;

/** Rounding slack when comparing a pixel height to a column. */
const EPSILON_PX = 1e-3;

/**
 * Returns the page count of every chapter without laying any out: measured counts are kept, the
 * others are simulated with character widths (greedy line breaking) and column filling. Linear in
 * the length of the book, with no DOM access.
 *
 * @param book - Text of the book.
 * @param chapters - Chapters of the book.
 * @param measured - Counts known from a real layout.
 * @param geometry - Page and font metrics of the current layout.
 * @returns One count per chapter, each at least one.
 */
export function estimatePageCounts(
  book: BookText,
  chapters: readonly Chapter[],
  measured: MeasuredCounts,
  geometry: PageGeometry,
): number[] {
  const lines = new LineBreaker(geometry);
  return chapters.map((chapter, index) => {
    const known = measured[index];
    if (known !== undefined) {
      return known;
    }
    const columns = new ColumnFiller(geometry.height);
    const body = geometry.fontSize;
    const heading = body * HEADING_SCALE;
    const meta = body * META_SCALE;
    if (index === 0) {
      columns.heading(lines.count(book.title, HEADING_SCALE), heading, body);
      columns.place(lines.count(book.author, META_SCALE), meta * LEADING_BODY, meta * GAP_EM);
    }
    for (let block = chapter.firstBlock; block < chapter.firstBlock + chapter.blockCount; block++) {
      const { kind, text } = book.blocks[block];
      if (kind === 'heading') {
        columns.heading(lines.count(text, HEADING_SCALE), heading, body);
      } else {
        columns.place(lines.count(text, 1), body * LEADING_BODY, body * GAP_EM);
      }
    }
    if (index === chapters.length - 1) {
      columns.place(lines.count(END_MARK, META_SCALE), meta * LEADING_BODY, 0);
    }
    return columns.pages;
  });
}

/**
 * Returns the one-based page number in the whole book.
 *
 * @param counts - Page count of each chapter.
 * @param chapter - Current chapter.
 * @param page - Zero-based page in the current chapter.
 * @returns Page number.
 */
export function bookPageNumber(counts: readonly number[], chapter: number, page: number): number {
  return bookPageTotal(counts.slice(0, chapter)) + page + 1;
}

/**
 * Returns the page count of the whole book.
 *
 * @param counts - Page count of each chapter.
 * @returns Total.
 */
export function bookPageTotal(counts: readonly number[]): number {
  return counts.reduce((total, count) => total + count, 0);
}

/**
 * Serializes measured counts with the layout they belong to.
 *
 * @param layout - Layout key (viewport size and font tier).
 * @param counts - Measured counts.
 * @returns JSON for `localStorage`.
 */
export function serializePageCounts(layout: string, counts: MeasuredCounts): string {
  return JSON.stringify({ layout, counts: counts.map((count) => count ?? null) });
}

/**
 * Reads stored counts, dropping them when they belong to another layout or chapter split.
 *
 * @param raw - Stored JSON.
 * @param layout - Current layout key.
 * @param chapterCount - Number of chapters of the book as received.
 * @returns One entry per chapter, `undefined` where unknown.
 */
export function parsePageCounts(
  raw: string | null,
  layout: string,
  chapterCount: number,
): (number | undefined)[] {
  const unknown = Array.from<number | undefined>({ length: chapterCount });
  try {
    const value = JSON.parse(raw ?? 'null') as { layout?: unknown; counts?: unknown } | null;
    const counts = value?.counts;
    if (
      value?.layout !== layout ||
      !Array.isArray(counts) ||
      counts.length !== chapterCount ||
      !counts.every((count) => count === null || (Number.isInteger(count) && count > 0))
    ) {
      return unknown;
    }
    return counts.map((count: number | null) => count ?? undefined);
  } catch {
    return unknown;
  }
}

/** Greedy line breaking on summed character widths, with approximate hyphenation. */
class LineBreaker {
  private readonly widths = new Map<string, number>();

  constructor(private readonly geometry: PageGeometry) {}

  /** Returns the line count of a block whose font is `scale` times the body font. */
  public count(text: string, scale: number): number {
    const width = this.geometry.width / scale;
    const space = this.widthOf(' ');
    const hyphen = this.widthOf('-');
    let lines = 1;
    let x = 0;
    let wordWidth = 0;
    let wordLength = 0;
    const endWord = () => {
      if (wordLength === 0) {
        return;
      }
      const needed = x > 0 ? x + space + wordWidth : wordWidth;
      if (needed <= width) {
        x = needed;
      } else if (x > 0 && wordLength >= HYPHEN_MIN_WORD) {
        const perChar = wordWidth / wordLength;
        const head = Math.min(
          wordLength - HYPHEN_MIN_SIDE,
          Math.floor((width - x - space - hyphen) / perChar),
        );
        lines++;
        x = head >= HYPHEN_MIN_SIDE ? perChar * (wordLength - head) : wordWidth;
      } else if (wordWidth > width) {
        // `overflow-wrap: anywhere` cuts a word wider than the column.
        lines += Math.ceil(wordWidth / width) - (x > 0 ? 0 : 1);
        x = wordWidth % width;
      } else {
        lines++;
        x = wordWidth;
      }
      wordWidth = 0;
      wordLength = 0;
    };
    for (const char of text) {
      if (char === ' ') {
        endWord();
      } else if (char === '\n') {
        endWord();
        lines++;
        x = 0;
      } else {
        wordWidth += this.widthOf(char);
        wordLength++;
      }
    }
    endWord();
    return lines;
  }

  private widthOf(char: string): number {
    let width = this.widths.get(char);
    if (width === undefined) {
      width = this.geometry.charWidth(char);
      this.widths.set(char, width);
    }
    return width;
  }
}

/** Fills columns line by line, honouring orphans, widows and headings kept with the next lines. */
class ColumnFiller {
  public pages = 1;

  private y = 0;

  constructor(private readonly height: number) {}

  /** Places a heading, moved to the next column when the lines after it would not follow. */
  public heading(lines: number, size: number, body: number): void {
    const lineHeight = size * LEADING_TIGHT;
    const needed = lines * lineHeight + size * GAP_EM + ORPHANS * body * LEADING_BODY;
    if (this.y > 0 && this.y + needed > this.height + EPSILON_PX) {
      this.newColumn();
    }
    this.place(lines, lineHeight, size * GAP_EM);
  }

  /** Places a block of lines followed by its bottom margin. */
  public place(lines: number, lineHeight: number, margin: number): void {
    let left = lines;
    for (;;) {
      const fit = Math.floor((this.height - this.y) / lineHeight + EPSILON_PX);
      if (fit >= left) {
        this.y += left * lineHeight + margin;
        return;
      }
      let taken = Math.min(fit, left - WIDOWS);
      if (taken < ORPHANS) {
        taken = fit >= ORPHANS ? Math.min(fit, left - 1) : 0;
      }
      if (taken === 0 && this.y === 0) {
        taken = Math.max(1, fit);
      }
      left -= taken;
      this.newColumn();
    }
  }

  private newColumn(): void {
    this.pages++;
    this.y = 0;
  }
}
