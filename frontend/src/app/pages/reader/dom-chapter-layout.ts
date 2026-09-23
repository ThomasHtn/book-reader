import { TextPosition } from '@core/reader/reading-progress';
import { lowerBound } from '@core/reader/lower-bound';
import { PageGeometry } from '@core/reader/page-count';
import { pageAt, pageCount } from '@core/reader/page-math';
import { ChapterContent, ChapterLayout } from './chapter-layout';

/** Tolerance for sub-pixel rounding when comparing positions to a column edge. */
const EDGE_TOLERANCE_PX = 0.5;

/**
 * Lays a chapter out in CSS columns exactly as wide as the viewport and locates text with `Range`,
 * the only DOM API used for positions (specification 5.3). The page arithmetic itself is pure.
 */
export class DomChapterLayout implements ChapterLayout {
  private columnWidth = 1;

  private firstBlock = 0;

  private blockElements: HTMLElement[] = [];

  constructor(
    private readonly viewport: HTMLElement,
    private readonly columns: HTMLElement,
  ) {}

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
      nodes.push(element(document, 'p', 'Fin du livre', 'end'));
    }
    this.firstBlock = content.firstBlock;
    this.columnWidth = Math.max(1, this.viewport.clientWidth);
    this.columns.style.setProperty('--column-width', `${this.columnWidth}px`);
    this.columns.style.transform = '';
    this.columns.replaceChildren(...nodes);
    return pageCount(this.columns.scrollWidth, this.columnWidth);
  }

  public show(page: number): void {
    this.columns.style.transform = `translateX(${-page * this.columnWidth}px)`;
  }

  public pageOf(position: TextPosition): number {
    const block = this.blockElements[position.blockIndex - this.firstBlock];
    if (!block) {
      return 0;
    }
    return pageAt(characterLeft(block, position.charOffset) - this.origin(), this.columnWidth);
  }

  public positionOfPage(page: number): TextPosition {
    const pageLeft = this.origin() + page * this.columnWidth;
    const blocks = this.blockElements;
    // Blocks are in reading order, so their right edges grow: find the first reaching into the page.
    const index = lowerBound(
      0,
      blocks.length,
      (i) => blocks[i].getBoundingClientRect().right > pageLeft + EDGE_TOLERANCE_PX,
    );
    if (index === blocks.length) {
      return { blockIndex: this.firstBlock + Math.max(0, blocks.length - 1), charOffset: 0 };
    }
    const block = blocks[index];
    const length = block.firstChild?.textContent?.length ?? 0;
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

  public geometry(): PageGeometry {
    const style = getComputedStyle(this.columns);
    const fontSize = parseFloat(style.fontSize);
    const context = this.columns.ownerDocument.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.letterSpacing = style.letterSpacing;
    }
    return {
      width: this.columnWidth,
      height: this.viewport.clientHeight,
      fontSize,
      // Without a canvas, an average Luciole advance keeps the estimate in range.
      charWidth: (char) => context?.measureText(char).width ?? fontSize * 0.55,
    };
  }

  /** Left edge of the first column, which moves with the translation of the columns. */
  private origin(): number {
    return this.columns.getBoundingClientRect().left;
  }
}

function element(document: Document, tag: string, text: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) {
    node.className = className;
  }
  return node;
}

/** Left edge of one character, from a one-character `Range`; collapsed characters defer to the next one. */
function characterLeft(block: HTMLElement, offset: number): number {
  const text = block.firstChild;
  const length = text?.textContent?.length ?? 0;
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
  return block.getBoundingClientRect().right;
}
