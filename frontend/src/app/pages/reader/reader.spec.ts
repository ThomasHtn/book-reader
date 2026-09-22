import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BookContent } from '@core/http/api.model';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
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
};

/** One page per block, so pages and positions are easy to predict. */
class FakeLayout implements ChapterLayout {
  public content: ChapterContent | undefined;
  public shownPage = -1;
  public renders = 0;

  public render(content: ChapterContent): number {
    this.content = content;
    this.renders++;
    return content.blocks.length;
  }

  public show(page: number): void {
    this.shownPage = page;
  }

  public pageOf(position: TextPosition): number {
    return position.blockIndex - this.content!.firstBlock;
  }

  public positionOfPage(page: number): TextPosition {
    return { blockIndex: this.content!.firstBlock + page, charOffset: 0 };
  }
}

describe('Reader', () => {
  let http: HttpTestingController;
  let data: FakeReaderData;
  let store: FakeProgressStore;
  let layouts: FakeLayout[];
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stubResizeObserver();
    data = new FakeReaderData();
    store = new FakeProgressStore();
    layouts = [];
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
            const layout = new FakeLayout();
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
    expect(indicator()).toBe('20 %');
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

    expect(indicator()).toBe('100 %');
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
