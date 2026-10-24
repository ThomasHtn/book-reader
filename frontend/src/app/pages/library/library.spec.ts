import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ProgressStore } from '@core/reader/progress-store';
import {
  book,
  FakeProgressStore,
  FakeReaderData,
  stubResizeObserver,
} from '@core/reader/reader.fixtures';
import { ReaderData } from '@core/reader/reader-data';

import { assignCoverTones } from './cover-tone.utils';
import { Library } from './library';

describe('Library', () => {
  /**
   * List and settings the page polls, set by each test.
   */
  let data: FakeReaderData;

  /**
   * In-memory progress, which orders the list.
   */
  let store: FakeProgressStore;

  /**
   * Router spy, so no navigation really happens.
   */
  let navigate: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    stubResizeObserver();
    data = new FakeReaderData();
    store = new FakeProgressStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ReaderData, useValue: data },
        { provide: ProgressStore, useValue: store },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  /**
   * Renders the page and returns its element.
   */
  async function render() {
    const fixture = TestBed.createComponent(Library);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('says the shelf is empty once the list arrives without any book', async () => {
    data.books.set([]);

    const element = await render();

    expect(element.querySelector('.library__empty')?.textContent?.trim()).toBe(
      "Aucun livre pour l'instant. Ils apparaîtront ici dès leur ajout.",
    );
    expect(element.querySelector('.page-head__indicator')?.textContent?.trim()).toBe('');
  });

  it('keeps the page blank while the list is loading, as for a book', async () => {
    const element = await render();

    expect(element.querySelector('.library__empty')).toBeNull();
    expect(element.querySelector('.book-card')).toBeNull();
  });

  it('lists books with the one in progress first, marked, and finished ones labelled', async () => {
    data.books.set([book('new', '2026-09-10T00:00:00Z'), book('reading'), book('done')]);
    store.progress.set('reading', {
      blockIndex: 1,
      charOffset: 0,
      finished: false,
      updatedAt: '2026-09-17T08:00:00Z',
    });
    store.progress.set('done', {
      blockIndex: 0,
      charOffset: 0,
      finished: true,
      updatedAt: '2026-09-16T08:00:00Z',
    });

    const element = await render();
    const cards = [...element.querySelectorAll<HTMLButtonElement>('button.book-card')];

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Mes livres');
    expect(
      cards.map((card) => card.querySelector('.book-card__title')?.textContent?.trim()),
    ).toEqual(['Titre reading', 'Titre done', 'Titre new']);
    expect(
      cards.map((card) => card.querySelector('.book-card__author')?.textContent?.trim()),
    ).toEqual(['Auteur reading', 'Auteur done', 'Auteur new']);
    expect(cards[0].classList).toContain('book-card--current');
    expect(cards[0].querySelector('.book-card__tag')?.textContent?.trim()).toBe('En cours');
    expect(cards[1].classList).toContain('book-card--finished');
    expect(cards[1].querySelector('.book-card__tag')?.textContent?.trim()).toBe('Terminé');
    expect(cards[2].classList).not.toContain('book-card--current');
  });

  it('opens a book from its card', async () => {
    data.books.set([book('a')]);
    const element = await render();

    element.querySelector<HTMLButtonElement>('button.book-card')!.click();

    expect(navigate).toHaveBeenCalledWith('/lire/a');
  });

  it('binds every book in a cloth of its own, none for the book in progress', async () => {
    data.books.set([book('a'), book('reading'), book('b')]);
    store.progress.set('reading', {
      blockIndex: 1,
      charOffset: 0,
      finished: false,
      updatedAt: '2026-09-17T08:00:00Z',
    });
    const element = await render();
    const cards = [...element.querySelectorAll<HTMLButtonElement>('button.book-card')];

    const expected = assignCoverTones([null, 'a', 'b'], 3);
    expect(cards.map((card) => card.dataset['tone'] ?? null)).toEqual(
      expected.map((tone) => (tone === null ? null : String(tone))),
    );
  });

  it('shows the range of titles and drops the whole footer when everything fits on one page', async () => {
    data.books.set([book('a'), book('b'), book('c')]);
    const element = await render();

    expect(element.querySelector('[aria-live]')?.textContent?.trim()).toBe('Titres 1 à 3 sur 3');
    expect(element.querySelector('footer')).toBeNull();
    expect(element.querySelectorAll('button.nav-bar')).toHaveLength(0);
  });

  it('turns pages of titles with the arrows, leaving Space and browser chords alone', async () => {
    // Seven cards, three per 100 px row, in a 200 px viewport: two rows on the first page.
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const cards = [...(this.closest('.library__grid')?.querySelectorAll('.book-card') ?? [])];
      const index = cards.indexOf(this);
      return { top: index < 0 ? 0 : Math.floor(index / 3) * 100, height: 90 } as DOMRect;
    });
    data.books.set(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => book(id)));
    const fixture = TestBed.createComponent(Library);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const indicator = () => element.querySelector('.page-head__indicator')?.textContent?.trim();
    const press = async (key: string, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init });
      document.dispatchEvent(event);
      await fixture.whenStable();
      return event.defaultPrevented;
    };

    expect(indicator()).toBe('Titres 1 à 6 sur 7');

    expect(await press('ArrowLeft', { altKey: true })).toBe(false);
    expect(await press(' ')).toBe(false);
    expect(indicator()).toBe('Titres 1 à 6 sur 7');

    expect(await press('ArrowRight')).toBe(true);
    expect(indicator()).toBe('Titres 7 à 7 sur 7');
  });

  /**
   * Seven books, three per row in a 200 px viewport, rows `rowHeight` apart; returns page helpers.
   */
  async function renderSevenBooks(rowHeight: () => number) {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const cards = [...(this.closest('.library__grid')?.querySelectorAll('.book-card') ?? [])];
      const index = cards.indexOf(this);
      const top = index < 0 ? 0 : Math.floor(index / 3) * rowHeight();
      return { top, height: rowHeight() - 10 } as DOMRect;
    });
    data.books.set(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => book(id)));
    const fixture = TestBed.createComponent(Library);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const indicator = () => element.querySelector('.page-head__indicator')?.textContent?.trim();
    const cards = () => [...element.querySelectorAll<HTMLButtonElement>('button.book-card')];
    return { fixture, indicator, cards };
  }

  it('pages the titles again once the fonts arrive, since they change the height of the cards', async () => {
    let rowHeight = 100;
    let fontsLoaded!: () => void;
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>((resolve) => (fontsLoaded = resolve)) },
    });
    try {
      const { fixture, indicator } = await renderSevenBooks(() => rowHeight);
      expect(indicator()).toBe('Titres 1 à 6 sur 7');

      rowHeight = 150;
      fontsLoaded();
      await document.fonts.ready;
      await fixture.whenStable();

      expect(indicator()).toBe('Titres 1 à 3 sur 7');
    } finally {
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('moves the focus to the first title of the new page when the focused one leaves the page', async () => {
    const { fixture, cards } = await renderSevenBooks(() => 100);
    cards()[1].focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    await fixture.whenStable();

    expect(document.activeElement).toBe(cards()[6]);
  });

  it('shows the unavailable screen only while the list has never loaded', async () => {
    data.unreachable.set(true);
    const element = await render();
    expect(element.textContent).toContain('Le service est indisponible');
  });
});
