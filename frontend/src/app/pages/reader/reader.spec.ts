import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BookContent } from '@core/http/api.model';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { PageGeometry } from '@core/reader/page-count';
import { TextPosition } from '@core/reader/reading-progress';
import { FakeProgressStore, FakeReaderData, stubResizeObserver } from '../../testing/reader-fakes';
import { CHAPTER_LAYOUT_FACTORY, ChapterContent, ChapterLayout } from './chapter-layout';
import { Reader } from './reader';

/** Two chapters: blocks 0-2 (3 pages) and 3-4 (2 pages). */
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

/** One page per block, so pages and positions are easy to predict; the title page may take one too. */
class FakeLayout implements ChapterLayout {
  public content: ChapterContent | undefined;
  public shownPage = -1;
  public renders = 0;

  constructor(private readonly titlePagePages = 0) {}

  public render(content: ChapterContent): number {
    this.content = content;
    this.renders++;
    return content.blocks.length + this.lead();
  }

  public show(page: number): void {
    this.shownPage = page;
  }

  public pageOf(position: TextPosition): number {
    return position.blockIndex - this.content!.firstBlock + this.lead();
  }

  public positionOfPage(page: number): TextPosition {
    return {
      blockIndex: this.content!.firstBlock + Math.max(0, page - this.lead()),
      charOffset: 0,
    };
  }

  /** One line per block, one line per page, so estimates match one page per block. */
  public geometry(): PageGeometry {
    return { width: 1000, height: 14, fontSize: 10, charWidth: () => 1 };
  }

  private lead(): number {
    return this.content?.titlePage ? this.titlePagePages : 0;
  }
}

/** Layout key in jsdom at tier 100: no layout, so no size. */
const JSDOM_LAYOUT = '0x0:100';

describe('Reader', () => {
  let http: HttpTestingController;
  let data: FakeReaderData;
  let store: FakeProgressStore;
  let layouts: FakeLayout[];
  let navigate: ReturnType<typeof vi.fn>;
  let titlePagePages: number;

  beforeEach(() => {
    vi.useFakeTimers();
    stubResizeObserver();
    data = new FakeReaderData();
    store = new FakeProgressStore();
    layouts = [];
    titlePagePages = 0;
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
            const layout = new FakeLayout(titlePagePages);
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

  const visible = () => layouts[0];

  async function flush(fixture: { detectChanges(): void }): Promise<void> {
    fixture.detectChanges();
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    TestBed.tick();
  }

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
    return { fixture, element, prev, next, indicator };
  }

  it('opens a never read book at its first page, with the title page before the text', async () => {
    const { prev, next, indicator, fixture } = await open();

    expect(store.last).toBe('b1');
    expect(fixture.nativeElement.querySelector('h1.visually-hidden')?.textContent?.trim()).toBe(
      'Le Horla',
    );
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
    data.settings.set({ fontTier: 100 });
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
    data.settings.set({ fontTier: 100 });
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

    data.settings.set({ fontTier: 140 });
    await flush(fixture);

    expect(visible().renders).toBe(renders + 1);
    expect(visible().shownPage).toBe(1);
  });

  it('opens "Mes livres" from the footer', async () => {
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
