import { MeasuredCounts } from '@core/reader/reader.model';

import { END_MARK } from './pagination.constants';
import { BookText, Chapter, PageGeometry } from './pagination.model';

/**
 * Body line height ratio, as `--leading-body` in tokens.css.
 */
const LEADING_BODY = 1.4;

/**
 * Heading size relative to the body, as `--text-heading` in tokens.css.
 */
const HEADING_SCALE = 1.15;

/**
 * Heading line height ratio, as `--leading-tight` in tokens.css.
 */
const LEADING_TIGHT = 1.15;

/**
 * Gap after a block in ems of its own size, as `--gap-paragraph` in tokens.css.
 */
const GAP_EM = 0.6;

/**
 * Author and end mark size relative to the body, as `--text-meta` in tokens.css (its clamp ignored).
 */
const META_SCALE = 0.5;

/**
 * Lines kept at least at the bottom of a column before a break, as Blink does (spec 5.2).
 */
const ORPHANS = 2;

/**
 * Lines carried at least to the next column; a three-line paragraph splits two and one (spec 5.2).
 */
const WIDOWS = 2;

/**
 * Shortest word French `hyphens: auto` splits, approximated (spec 5.2).
 */
const HYPHEN_MIN_WORD = 7;

/**
 * Fewest letters left on each side of a hyphen.
 */
const HYPHEN_MIN_SIDE = 3;

/**
 * Rounding slack when comparing a pixel height to a column.
 */
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
    // A chapter always starts on a fresh column.
    const columns = new ColumnFiller(geometry.height);
    const body = geometry.fontSize;
    const heading = body * HEADING_SCALE;
    const meta = body * META_SCALE;
    // The title page sits before the first chapter, as `DomChapterLayout` renders it.
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
 * Greedy line breaking on summed character widths, with approximate hyphenation.
 */
class LineBreaker {
  /**
   * Advance of each character met, since canvas measures are slow.
   */
  private readonly widths = new Map<string, number>();

  /**
   * Takes the column width and the character measure.
   */
  constructor(private readonly geometry: PageGeometry) {}

  /**
   * Returns the line count of a block whose font is `scale` times the body font.
   */
  public count(text: string, scale: number): number {
    // A larger font fits fewer characters: scale the column down instead of every advance up.
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
        // A long word splits when three letters at least fit the line, keeping three for the next one.
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

  /**
   * Advance of one character at body size, measured once.
   */
  private widthOf(char: string): number {
    let width = this.widths.get(char);
    if (width === undefined) {
      width = this.geometry.charWidth(char);
      this.widths.set(char, width);
    }
    return width;
  }
}

/**
 * Fills columns line by line, honouring orphans, widows and headings kept with the next lines.
 */
class ColumnFiller {
  /**
   * Columns used so far, which is the chapter's page count once every block is placed.
   */
  public pages = 1;

  /**
   * Height already filled in the current column, in CSS pixels.
   */
  private y = 0;

  /**
   * Takes the column height in CSS pixels.
   */
  constructor(private readonly height: number) {}

  /**
   * Places a heading, moved to the next column when the lines after it would not follow.
   */
  public heading(lines: number, size: number, body: number): void {
    const lineHeight = size * LEADING_TIGHT;
    const needed = lines * lineHeight + size * GAP_EM + ORPHANS * body * LEADING_BODY;
    if (this.y > 0 && this.y + needed > this.height + EPSILON_PX) {
      this.newColumn();
    }
    this.place(lines, lineHeight, size * GAP_EM);
  }

  /**
   * Places a block of lines followed by its bottom margin.
   */
  public place(lines: number, lineHeight: number, margin: number): void {
    let left = lines;
    for (;;) {
      const fit = Math.floor((this.height - this.y) / lineHeight + EPSILON_PX);
      if (fit >= left) {
        this.y += left * lineHeight + margin;
        return;
      }
      // Split the block: keep widows below the break and orphans above it, or push it all to the next column.
      let taken = Math.min(fit, left - WIDOWS);
      if (taken < ORPHANS) {
        taken = fit >= ORPHANS ? Math.min(fit, left - 1) : 0;
      }
      // A block taller than an empty column must still progress, or the loop would never end.
      if (taken === 0 && this.y === 0) {
        taken = Math.max(1, fit);
      }
      left -= taken;
      this.newColumn();
    }
  }

  /**
   * Starts the next column, that is the next page.
   */
  private newColumn(): void {
    this.pages++;
    this.y = 0;
  }
}
