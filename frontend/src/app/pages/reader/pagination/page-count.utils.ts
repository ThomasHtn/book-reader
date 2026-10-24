import { MeasuredCounts } from '@core/reader/reader.model';

import { END_MARK } from './pagination.constants';
import { BookText, Chapter, PageGeometry } from './pagination.model';

/**
 * Body line height ratio, as `--leading-body` in tokens.css.
 */
const LEADING_BODY = 1.55;

/**
 * Heading size relative to the body, as `--text-heading` in tokens.css.
 */
const HEADING_SCALE = 1.5;

/**
 * Heading line height ratio, as `--leading-tight` in tokens.css.
 */
const LEADING_TIGHT = 1.2;

/**
 * Room above a heading in ems of the heading, as `--heading-space-before` in tokens.css.
 */
const HEADING_BEFORE_EM = 0.4;

/**
 * Room below a heading or the author line in ems of their size, as `--heading-space-after`.
 */
const HEADING_AFTER_EM = 1;

/**
 * First line indent of a paragraph that follows another one, as `--indent-paragraph` in tokens.css.
 */
const INDENT_EM = 1.5;

/**
 * Author and end mark size relative to the body, as `--text-meta` in tokens.css.
 */
const META_SCALE = 0.6;

/**
 * Smallest author and end mark size in CSS pixels, the lower bound of `--text-meta`.
 */
const META_MIN_PX = 16;

/**
 * Largest author and end mark size in CSS pixels, the upper bound of `--text-meta`.
 */
const META_MAX_PX = 64;

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
  // Headings and the book title are bold, hence wider than the body text.
  const lines = new LineBreaker(geometry.width, geometry.charWidth);
  const boldLines = new LineBreaker(geometry.width, geometry.boldCharWidth);
  const body = geometry.fontSize;
  const heading = body * HEADING_SCALE;
  const meta = Math.min(META_MAX_PX, Math.max(META_MIN_PX, body * META_SCALE));
  return chapters.map((chapter, index) => {
    const known = measured[index];
    if (known !== undefined) {
      return known;
    }
    // A chapter always starts on a fresh column.
    const columns = new ColumnFiller(geometry.height);
    // The title page sits before the first chapter, as `DomChapterLayout` renders it.
    if (index === 0) {
      columns.heading(boldLines.count(book.title, HEADING_SCALE), heading, body);
      columns.place(
        lines.count(book.author, meta / body),
        meta * LEADING_BODY,
        meta * HEADING_AFTER_EM,
      );
    }
    // Only a paragraph following another one is indented, as in reading.css.
    let indent = 0;
    for (let block = chapter.firstBlock; block < chapter.firstBlock + chapter.blockCount; block++) {
      const { kind, text } = book.blocks[block];
      if (kind === 'heading') {
        columns.heading(boldLines.count(text, HEADING_SCALE), heading, body);
        indent = 0;
      } else {
        columns.place(lines.count(text, 1, indent), body * LEADING_BODY, 0);
        indent = body * INDENT_EM;
      }
    }
    if (index === chapters.length - 1) {
      columns.place(lines.count(END_MARK, meta / body), meta * LEADING_BODY, 0);
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
   * Takes the column width and the measure of one character at body size, in one weight.
   */
  constructor(
    private readonly columnWidth: number,
    private readonly charWidth: (char: string) => number,
  ) {}

  /**
   * Returns the line count of a block whose font is `scale` times the body font, its first line
   * starting `indent` pixels in.
   */
  public count(text: string, scale: number, indent = 0): number {
    // A larger font fits fewer characters: scale the column down instead of every advance up.
    const width = this.columnWidth / scale;
    const space = this.widthOf(' ');
    const hyphen = this.widthOf('-');
    let lines = 1;
    let x = indent / scale;
    // Whether no word sits on the line yet, so the next one needs no space before it.
    let lineStart = true;
    let wordWidth = 0;
    let wordLength = 0;
    const endWord = () => {
      if (wordLength === 0) {
        return;
      }
      const atStart = lineStart;
      lineStart = false;
      const needed = atStart ? x + wordWidth : x + space + wordWidth;
      if (needed <= width) {
        x = needed;
      } else if (!atStart && wordLength >= HYPHEN_MIN_WORD) {
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
        lines += Math.ceil(wordWidth / width) - (atStart ? 1 : 0);
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
        lineStart = true;
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
      width = this.charWidth(char);
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
   * Places a heading with the room around it, moved to the next column when the lines after it
   * would not follow.
   */
  public heading(lines: number, size: number, body: number): void {
    const lineHeight = size * LEADING_TIGHT;
    const before = size * HEADING_BEFORE_EM;
    const after = size * HEADING_AFTER_EM;
    const needed = before + lines * lineHeight + after + ORPHANS * body * LEADING_BODY;
    if (this.y > 0 && this.y + needed > this.height + EPSILON_PX) {
      this.newColumn();
    }
    // Padding, unlike a margin, is kept at the top of a column.
    this.y += before;
    this.place(lines, lineHeight, after);
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
