import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { BookContent } from '@core/http/api.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { ProgressStore } from '@core/reader/progress-store';
import {
  FakeProgressStore,
  FakeReaderData,
  stubResizeObserver,
} from '@core/reader/reader.fixtures';
import { TextPosition } from '@core/reader/reader.model';
import { ReaderData } from '@core/reader/reader-data';

import { CHAPTER_LAYOUT_FACTORY } from './pagination/pagination.constants';
import { ChapterContent, ChapterLayout, PageGeometry } from './pagination/pagination.model';
import { Reader } from './reader';

/**
 * Two chapters: blocks 0-2 (3 pages) and 3-4 (2 pages).
 */
const BOOK: BookContent = {
  id: 'b1',
  title: 'Le Horla',
  author: 'Guy de Maupassant',
  blocks: [
    { kind: 'heading', text: 'I' },
    { kind: 'paragraph', text: 'a' },
    { kind: 'paragraph', text: 'b' },
    { kind: 'heading', text: 'II' },
    { kind: 'paragraph', text: 'c' },
  ],
  finishedAt: null,
};

/**
 * One page per block, so pages and positions are easy to predict; the title page may take one too.
 */
class FakeLayout implements ChapterLayout {
  /**
   * Chapter rendered last.
   */
  public content: ChapterContent | undefined;

  /**
   * Page shown last, -1 before any.
   */
  public shownPage = -1;

  /**
   * Number of renders, to check when a relayout happens.
   */
  public renders = 0;

  /**
   * Takes the pages the title page fills on the first chapter and the pages shown side by side.
   */
  constructor(
    private readonly titlePagePages = 0,
    private readonly perView = 1,
  ) {}

  /**
   * One page per block, plus the title page's on the first chapter.
   */
  public render(content: ChapterContent): number {
    this.content = content;
    this.renders++;
    return content.blocks.length + this.lead();
  }

  /**
   * Records the page for assertions.
   */
  public show(page: number): void {
    this.shownPage = page;
  }

  /**
   * Page of the position's block.
   */
  public pageOf(position: TextPosition): number {
    return position.blockIndex - this.content!.firstBlock + this.lead();
  }

  /**
   * Start of the block shown on that page.
   */
  public positionOfPage(page: number): TextPosition {
    return {
      blockIndex: this.content!.firstBlock + Math.max(0, page - this.lead()),
      charOffset: 0,
    };
  }

  /**
   * One line per block and one block per page: a 25 px page holds a 15.5 px line, a 24 px
   * heading or the 24.8 px author line, never two blocks, so estimates match one page per block.
   */
  public geometry(): PageGeometry {
    return { width: 1000, height: 25, fontSize: 10, charWidth: () => 1, boldCharWidth: () => 1 };
  }

  /**
   * Pages side by side, as given to the constructor.
   */
  public pagesPerView(): number {
    return this.perView;
  }

  /**
   * Pages before the first block: the title page's, on the first chapter only.
   */
  private lead(): number {
    return this.content?.titlePage ? this.titlePagePages : 0;
  }
}

/**
 * Layout key in jsdom at tier 32: no layout, so no size.
 */
const JSDOM_LAYOUT = 'v2:0x0:32';

describe('Reader', () => {
  /**
   * Answers the book request.
   */
  let http: HttpTestingController;

  /**
   * Settings the reader polls, set by each test.
   */
  let data: FakeReaderData;

  /**
   * In-memory progress, inspected after page turns.
   */
  let store: FakeProgressStore;

  /**
   * Every layout the reader created, in order.
   */
  let layouts: FakeLayout[];

  /**
   * Router spy, so no navigation really happens.
   */
  let navigate: ReturnType<typeof vi.fn>;

  /**
   * Pages the title page fills in layouts created from now on.
   */
  let titlePagePages: number;

  /**
   * Pages side by side in layouts created from now on.
   */
  let perView: number;

  beforeEach(() => {
    vi.useFakeTimers();
    stubResizeObserver();
    data = new FakeReaderData();
    store = new FakeProgressStore();
    layouts = [];
    titlePagePages = 0;
    perView = 1;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ReaderData, useValue: data },
        { provide: ProgressStore, useValue: store },
        {
          provide: CHAPTER_LAYOUT_FACTORY,
          useValue: () => {
            const layout = new FakeLayout(titlePagePages, perView);
            layouts.push(layout);
            return layout;
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Layout of the opened book.
   */
  const visible = () => layouts[0];

  /**
   * Runs renders, effects and the zero-delay relayout timer.
   */
  async function flush(fixture: {
    /**
     * Renders the fixture's view; the only member flush needs.
     */
    detectChanges(): void;
  }): Promise<void> {
    fixture.detectChanges();
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    TestBed.tick();
  }

  /**
   * Opens a book and returns its fixture with accessors for the bars and the indicator.
   */
  async function open(book: BookContent = BOOK) {
    const fixture = TestBed.createComponent(Reader);
    fixture.componentRef.setInput('id', book.id);
    await flush(fixture);
    http.expectOne(API_ENDPOINTS.book(book.id)).flush(book);
    await flush(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const prev = () => element.querySelector<HTMLButtonElement>('button.nav-bar--prev');
    const next = () => element.querySelector<HTMLButtonElement>('button.nav-bar--next');
    const indicator = () => element.querySelector('[aria-live]')?.textContent?.trim();
    const folios = () =>
      Array.from(element.querySelectorAll('.reader__folios span'), (span) =>
        span.textContent?.trim(),
      );
    return { fixture, element, prev, next, indicator, folios };
  }

  it('opens a never read book at its first page, with the title page before the text', async () => {
    const { prev, next, indicator, folios, element } = await open();

    expect(store.last).toBe('b1');
    // Running head: title as the page heading, author beside it.
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Le Horla');
    expect(element.querySelector('.reader__head')?.textContent).toContain('Guy de Maupassant');
    expect(visible().content).toEqual({
      blocks: BOOK.blocks.slice(0, 3),
      firstBlock: 0,
      titlePage: { title: 'Le Horla', author: 'Guy de Maupassant' },
      endOfBook: false,
    });
    expect(visible().shownPage).toBe(0);
    expect(prev()).toBeNull();
    expect(next()).not.toBeNull();
    // Chapter II is estimated with the end mark the fake layout leaves out: 3 + 3.
    expect(indicator()).toBe('Page 1 sur 6');
    expect(folios()).toEqual(['1 sur 6']);
  });

  it('keeps each page turn in its own half, under its page, when the other is gone', async () => {
    const { element, fixture, next } = await open();
    const halves = () => Array.from(element.querySelectorAll('footer > div'));

    expect(element.querySelector('header .nav-bar--exit')).not.toBeNull();
    expect(halves()[0].children.length).toBe(0);
    expect(halves()[1].querySelector('.nav-bar--next')).not.toBeNull();

    next()!.click();
    await flush(fixture);
    expect(halves()[0].querySelector('.nav-bar--prev')).not.toBeNull();
  });

  it('shows two facing pages on a wide screen and turns both at once', async () => {
    perView = 2;
    const { fixture, prev, next, indicator, folios } = await open();

    expect(visible().shownPage).toBe(0);
    expect(indicator()).toBe('Pages 1 et 2 sur 6');
    expect(folios()).toEqual(['1', '2 sur 6']);

    next()!.click();
    await flush(fixture);
    // Chapter I has three pages: its last view shows page 3 with a blank right page.
    expect(visible().shownPage).toBe(2);
    expect(indicator()).toBe('Page 3 sur 6');
    expect(folios()).toEqual(['3 sur 6']);
    expect(store.saves.at(-1)?.position).toEqual({ blockIndex: 2, charOffset: 0 });

    vi.advanceTimersByTime(400);
    next()!.click();
    await flush(fixture);
    // Chapter II measured at two pages, both shown: the end of the book.
    expect(visible().content?.firstBlock).toBe(3);
    expect(indicator()).toBe('Pages 4 et 5 sur 5');
    expect(next()).toBeNull();
    expect(store.saves.at(-1)?.finished).toBe(true);

    vi.advanceTimersByTime(400);
    prev()!.click();
    await flush(fixture);
    expect(visible().content?.firstBlock).toBe(0);
    expect(visible().shownPage).toBe(2);
  });

  it('resumes a position on a right page at the view holding it', async () => {
    perView = 2;
    store.progress.set('b1', { blockIndex: 1, charOffset: 0, finished: false, updatedAt: 't' });
    await open();

    expect(visible().shownPage).toBe(0);
  });

  it('opens on the title page when it fills a page of its own, until the text is reached', async () => {
    titlePagePages = 1;
    const { prev, indicator, fixture } = await open();

    expect(visible().shownPage).toBe(0);
    expect(prev()).toBeNull();
    expect(indicator()).toMatch(/^Page 1 sur \d+$/);

    store.progress.set('b1', { blockIndex: 1, charOffset: 0, finished: false, updatedAt: 't' });
    fixture.destroy();
    layouts = [];
    await open();
    expect(visible().shownPage).toBe(2);
  });

  it('resumes at the stored position and marks the book finished on its last page', async () => {
    store.progress.set('b1', { blockIndex: 4, charOffset: 0, finished: false, updatedAt: 't' });
    const { next, indicator } = await open();

    expect(visible().content?.firstBlock).toBe(3);
    expect(visible().content?.endOfBook).toBe(true);
    expect(visible().shownPage).toBe(1);
    expect(next()).toBeNull();
    expect(store.saves.at(-1)).toEqual({
      bookId: 'b1',
      position: { blockIndex: 4, charOffset: 0 },
      finished: true,
    });

    // Chapter I is estimated with its title page, which the fake layout leaves out: 5 + 2.
    expect(indicator()).toBe('Page 7 sur 7');
  });

  it('turns pages across chapters and saves the first character of each page', async () => {
    store.progress.set('b1', { blockIndex: 2, charOffset: 0, finished: false, updatedAt: 't' });
    const { fixture, prev, next } = await open();

    next()!.click();
    await flush(fixture);
    expect(visible().content?.firstBlock).toBe(3);
    expect(visible().shownPage).toBe(0);
    expect(store.saves.at(-1)).toEqual({
      bookId: 'b1',
      position: { blockIndex: 3, charOffset: 0 },
      finished: false,
    });

    vi.advanceTimersByTime(400);
    prev()!.click();
    await flush(fixture);
    expect(visible().content?.firstBlock).toBe(0);
    expect(visible().shownPage).toBe(2);
    expect(store.saves.at(-1)?.position).toEqual({ blockIndex: 2, charOffset: 0 });
  });

  it('replaces estimates with the counts measured on the way, and keeps them', async () => {
    data.settings.set({ fontTier: 32 });
    const { fixture, next, indicator } = await open();
    expect(store.pageCounts.get('b1')).toEqual({ layout: JSDOM_LAYOUT, counts: [3, undefined] });

    for (let turn = 0; turn < 3; turn++) {
      next()!.click();
      await flush(fixture);
      vi.advanceTimersByTime(400);
    }

    expect(indicator()).toBe('Page 4 sur 5');
    expect(store.pageCounts.get('b1')).toEqual({ layout: JSDOM_LAYOUT, counts: [3, 2] });
  });

  it('numbers pages from the counts measured in an earlier session', async () => {
    store.progress.set('b1', { blockIndex: 4, charOffset: 0, finished: false, updatedAt: 't' });
    store.pageCounts.set('b1', { layout: JSDOM_LAYOUT, counts: [7, undefined] });
    data.settings.set({ fontTier: 32 });
    const { indicator } = await open();

    expect(indicator()).toBe('Page 9 sur 9');
  });

  it('neither reads nor overwrites stored counts before the settings are known', async () => {
    store.pageCounts.set('b1', { layout: JSDOM_LAYOUT, counts: [7, undefined] });
    const { indicator } = await open();

    expect(indicator()).toBe('Page 1 sur 6');
    expect(store.pageCounts.get('b1')).toEqual({ layout: JSDOM_LAYOUT, counts: [7, undefined] });
  });

  it('clears the finished flag when turning back from the last page', async () => {
    store.progress.set('b1', { blockIndex: 4, charOffset: 0, finished: false, updatedAt: 't' });
    const { fixture, prev } = await open();

    prev()!.click();
    await flush(fixture);

    expect(store.saves.at(-1)).toEqual({
      bookId: 'b1',
      position: { blockIndex: 3, charOffset: 0 },
      finished: false,
    });
  });

  it('restarts a finished book, or a position beyond the book, at the first page', async () => {
    store.progress.set('b1', { blockIndex: 4, charOffset: 0, finished: true, updatedAt: 't' });
    await open();
    expect(visible().shownPage).toBe(0);
    expect(visible().content?.firstBlock).toBe(0);
  });

  it('restarts at the first page a book marked as read after the last reading', async () => {
    store.progress.set('b1', {
      blockIndex: 4,
      charOffset: 0,
      finished: false,
      updatedAt: '2026-09-17T10:00:00.000Z',
    });
    await open({ ...BOOK, finishedAt: '2026-09-18T10:00:00Z' });
    expect(visible().content?.firstBlock).toBe(0);
    expect(visible().shownPage).toBe(0);
  });

  it('keeps a finished book finished when it is only opened, and starts a new reading on the first turn', async () => {
    store.progress.set('b1', { blockIndex: 4, charOffset: 0, finished: true, updatedAt: 't' });
    const { fixture, next } = await open();
    expect(store.saves).toEqual([]);

    next()!.click();
    await flush(fixture);

    expect(store.saves.at(-1)?.finished).toBe(false);
  });

  it('keeps the read mark of the backoffice when the book is only opened', async () => {
    store.progress.set('b1', {
      blockIndex: 4,
      charOffset: 0,
      finished: false,
      updatedAt: '2026-09-17T10:00:00.000Z',
    });
    await open({ ...BOOK, finishedAt: '2026-09-18T10:00:00Z' });
    expect(store.saves).toEqual([]);
  });

  it('ignores a command within 400 ms of the previous one', async () => {
    const { fixture, next } = await open();

    next()!.click();
    next()!.click();
    await flush(fixture);
    expect(visible().shownPage).toBe(1);

    vi.advanceTimersByTime(400);
    next()!.click();
    await flush(fixture);
    expect(visible().shownPage).toBe(2);
  });

  it('maps right arrow and space to next, left arrow to previous, and ignores held keys', async () => {
    const { fixture } = await open();
    const press = (key: string, repeat = false) => {
      const event = new KeyboardEvent('keydown', { key, repeat, cancelable: true, bubbles: true });
      document.dispatchEvent(event);
      return event;
    };

    press('ArrowRight');
    await flush(fixture);
    expect(visible().shownPage).toBe(1);

    vi.advanceTimersByTime(400);
    const space = press(' ');
    await flush(fixture);
    expect(space.defaultPrevented).toBe(true);
    expect(visible().shownPage).toBe(2);

    vi.advanceTimersByTime(400);
    press('ArrowLeft', true);
    await flush(fixture);
    expect(visible().shownPage).toBe(2);

    vi.advanceTimersByTime(400);
    press('ArrowLeft');
    await flush(fixture);
    expect(visible().shownPage).toBe(1);
  });

  it('gives focus back to the text after a click, so space always means next', async () => {
    const { element, next, fixture } = await open();

    next()!.click();
    await flush(fixture);

    expect(document.activeElement).toBe(element.querySelector('section.reading'));
    expect(element.querySelector('main')?.contains(document.activeElement)).toBe(true);
  });

  it('keeps the position when the display settings change', async () => {
    store.progress.set('b1', { blockIndex: 1, charOffset: 0, finished: false, updatedAt: 't' });
    const { fixture } = await open();
    const renders = visible().renders;

    data.settings.set({ fontTier: 40 });
    await flush(fixture);

    expect(visible().renders).toBe(renders + 1);
    expect(visible().shownPage).toBe(1);
  });

  it('stays on the page after a title page filling a page alone when the layout changes', async () => {
    titlePagePages = 1;
    const { fixture, next } = await open();
    next()!.click();
    await flush(fixture);
    // Page 2 starts at the book's first character, like the title page before it.
    expect(visible().shownPage).toBe(1);

    data.settings.set({ fontTier: 40 });
    await flush(fixture);

    expect(visible().shownPage).toBe(1);
  });

  it('waits for the settings before laying the book out at their font tier', async () => {
    data.settingsSettled.set(false);
    const { fixture } = await open();
    expect(layouts).toEqual([]);

    data.settings.set({ fontTier: 32 });
    data.settingsSettled.set(true);
    await flush(fixture);

    expect(visible().renders).toBe(1);
    expect(store.pageCounts.get('b1')?.layout).toBe(JSDOM_LAYOUT);
  });

  it('opens "Mes livres" from the head line', async () => {
    const { element } = await open();

    element.querySelector<HTMLButtonElement>('.nav-bar--exit')!.click();

    expect(navigate).toHaveBeenCalledWith('/livres');
  });

  it('goes back to "Mes livres" without a message when the book is gone', async () => {
    const fixture = TestBed.createComponent(Reader);
    fixture.componentRef.setInput('id', 'gone');
    await flush(fixture);
    http
      .expectOne(API_ENDPOINTS.book('gone'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    await flush(fixture);

    expect(navigate).toHaveBeenCalledWith('/livres', { replaceUrl: true });
  });

  it('shows the unavailable screen when the server does not answer, and retries', async () => {
    const fixture = TestBed.createComponent(Reader);
    fixture.componentRef.setInput('id', 'b1');
    await flush(fixture);
    http.expectOne(API_ENDPOINTS.book('b1')).error(new ProgressEvent('offline'));
    await flush(fixture);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Le service est indisponible');

    element.querySelector<HTMLButtonElement>('button')!.click();
    await flush(fixture);
    http.expectOne(API_ENDPOINTS.book('b1')).flush(BOOK);
    await flush(fixture);
    expect(element.textContent).not.toContain('Le service est indisponible');
  });
});
