import { TextPosition } from '@core/reader/reader.model';

import { lowerBound } from './lower-bound.utils';
import { pageAt, pageCount } from './page-math.utils';
import { EDGE_TOLERANCE_PX, END_MARK } from './pagination.constants';
import { ChapterContent, ChapterLayout, PageGeometry } from './pagination.model';

/**
 * Lays a chapter out in CSS columns, one or two of them filling the viewport, and locates text with
 * `Range`, the only DOM API used for positions (specification 5.3). The page arithmetic itself is pure.
 */
export class DomChapterLayout implements ChapterLayout {
  /**
   * Page width in CSS pixels, read from the viewport at render.
   */
  private columnWidth = 1;

  /**
   * Distance from one page to the next, page width plus gap; never zero, as it divides offsets.
   */
  private pitch = 1;

  /**
   * Pages shown side by side, set by the stylesheet as `--pages-per-view`.
   */
  private perView = 1;

  /**
   * Book index of the rendered chapter's first block.
   */
  private firstBlock = 0;

  /**
   * One element per block of the chapter, title page and end mark excluded, so indexes match blocks.
   */
  private blockElements: HTMLElement[] = [];

  /**
   * Takes the page-sized viewport and the multi-column element it clips.
   */
  constructor(
    private readonly viewport: HTMLElement,
    private readonly columns: HTMLElement,
  ) {}

  /**
   * Replaces the columns' children with the chapter, one text node per element, and counts its pages.
   */
  public render(content: ChapterContent): number {
    const document = this.columns.ownerDocument;
    const nodes: HTMLElement[] = [];
    if (content.titlePage) {
      // The page h1 lives outside the text; a second one here would duplicate it.
      nodes.push(element(document, 'p', content.titlePage.title, 'book-title'));
      nodes.push(element(document, 'p', content.titlePage.author, 'author'));
    }
    this.blockElements = content.blocks.map((block) =>
      element(document, block.kind === 'heading' ? 'h2' : 'p', block.text),
    );
    nodes.push(...this.blockElements);
    if (content.endOfBook) {
      nodes.push(element(document, 'p', END_MARK, 'end'));
    }
    this.firstBlock = content.firstBlock;
    // The stylesheet sets one or two columns per viewport and the gap between them (spec 5.2).
    const style = getComputedStyle(this.columns);
    const gap = parseFloat(style.columnGap) || 0;
    this.perView = Math.max(1, parseInt(style.getPropertyValue('--pages-per-view'), 10) || 1);
    this.columnWidth = Math.max(
      1,
      (this.viewport.clientWidth - gap * (this.perView - 1)) / this.perView,
    );
    this.pitch = this.columnWidth + gap;
    this.columns.style.transform = '';
    this.columns.replaceChildren(...nodes);
    return pageCount(contentRight(this.columns) - this.origin(), this.pitch);
  }

  /**
   * Translates the columns by whole pages; nothing ever scrolls.
   */
  public show(page: number): void {
    this.columns.style.transform = `translateX(${-page * this.pitch}px)`;
  }

  /**
   * Page holding a position, from the left edge of its character (spec 5.3).
   */
  public pageOf(position: TextPosition): number {
    const block = this.blockElements[position.blockIndex - this.firstBlock];
    // A position outside this chapter falls back to its first page.
    if (!block) {
      return 0;
    }
    return pageAt(characterLeft(block, position.charOffset) - this.origin(), this.pitch);
  }

  /**
   * First character shown on a page: binary search over blocks, then over characters (spec 5.3).
   */
  public positionOfPage(page: number): TextPosition {
    const pageLeft = this.origin() + page * this.pitch;
    const blocks = this.blockElements;
    // Blocks are in reading order, so their right edges grow: find the first reaching into the page.
    const index = lowerBound(
      0,
      blocks.length,
      (i) => blocks[i].getBoundingClientRect().right > pageLeft + EDGE_TOLERANCE_PX,
    );
    // No block reaches into the page: fall back to the start of the last block.
    if (index === blocks.length) {
      return { blockIndex: this.firstBlock + Math.max(0, blocks.length - 1), charOffset: 0 };
    }
    const block = blocks[index];
    const length = block.firstChild?.textContent?.length ?? 0;
    // Within that block, the first character starting inside the page.
    const charOffset = lowerBound(
      0,
      length,
      (offset) => characterLeft(block, offset) >= pageLeft - EDGE_TOLERANCE_PX,
    );
    return {
      blockIndex: this.firstBlock + index,
      charOffset: Math.min(charOffset, Math.max(0, length - 1)),
    };
  }

  /**
   * Reads the page size and font for page count estimates, with canvases set to the body and heading weights.
   */
  public geometry(): PageGeometry {
    const style = getComputedStyle(this.columns);
    const fontSize = parseFloat(style.fontSize);
    const headingWeight = style.getPropertyValue('--weight-heading').trim() || 'bold';
    const body = this.measurer(style, style.fontWeight);
    const bold = this.measurer(style, headingWeight);
    return {
      width: this.columnWidth,
      height: this.viewport.clientHeight,
      fontSize,
      charWidth: (char) => body?.measureText(char).width ?? fontSize * AVERAGE_ADVANCE_EM,
      boldCharWidth: (char) => bold?.measureText(char).width ?? fontSize * AVERAGE_ADVANCE_EM,
    };
  }

  /**
   * Canvas set to the columns' font in one weight, `null` where canvas is unavailable.
   */
  private measurer(style: CSSStyleDeclaration, weight: string): CanvasRenderingContext2D | null {
    const context = this.columns.ownerDocument.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${weight} ${style.fontSize} ${style.fontFamily}`;
      context.letterSpacing = style.letterSpacing;
    }
    return context;
  }

  /**
   * Pages side by side, as read at the last render.
   */
  public pagesPerView(): number {
    return this.perView;
  }

  /**
   * Left edge of the first column, which moves with the translation of the columns.
   */
  private origin(): number {
    return this.columns.getBoundingClientRect().left;
  }
}

/**
 * Average Luciole advance in ems, standing in for character widths without a canvas.
 */
const AVERAGE_ADVANCE_EM = 0.55;

/**
 * Creates an element holding plain text only: block text is never parsed as HTML.
 */
function element(document: Document, tag: string, text: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) {
    node.className = className;
  }
  return node;
}

/**
 * Right edge of the last line of the columns: the end of the chapter's text, wherever its page falls.
 */
function contentRight(columns: HTMLElement): number {
  const last = columns.lastElementChild;
  if (!last) {
    return 0;
  }
  const rects = last.getClientRects();
  return rects.length > 0 ? rects[rects.length - 1].right : last.getBoundingClientRect().right;
}

/**
 * Left edge of one character, from a one-character `Range`; collapsed characters defer to the next one.
 */
function characterLeft(block: HTMLElement, offset: number): number {
  const text = block.firstChild;
  const length = text?.textContent?.length ?? 0;
  // An empty block has no character to measure.
  if (!text || length === 0) {
    return block.getBoundingClientRect().left;
  }
  const range = block.ownerDocument.createRange();
  for (let index = Math.min(Math.max(0, offset), length - 1); index < length; index++) {
    range.setStart(text, index);
    range.setEnd(text, index + 1);
    const rects = range.getClientRects();
    if (rects.length > 0) {
      return rects[0].left;
    }
  }
  // Only collapsed characters left: the block's right edge stands in.
  return block.getBoundingClientRect().right;
}
