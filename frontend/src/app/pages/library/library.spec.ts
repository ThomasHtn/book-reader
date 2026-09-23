import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { assignCoverTones } from '@core/reader/cover-tone';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import {
  book,
  FakeProgressStore,
  FakeReaderData,
  stubResizeObserver,
} from '../../testing/reader-fakes';
import { Library } from './library';

describe('Library', () => {
  let data: FakeReaderData;
  let store: FakeProgressStore;
  let navigate: ReturnType<typeof vi.fn>;

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

    expect(element.querySelector('.book-empty')?.textContent?.trim()).toBe(
      "Aucun livre pour l'instant. Ils apparaîtront ici dès leur ajout.",
    );
    expect(element.querySelector('.page-indicator')?.textContent?.trim()).toBe('');
  });

  it('keeps the page blank while the list is loading, as for a book', async () => {
    const element = await render();

    expect(element.querySelector('.book-empty')).toBeNull();
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
    expect(cards.map((card) => card.querySelector('.title')?.textContent?.trim())).toEqual([
      'Titre reading',
      'Titre done',
      'Titre new',
    ]);
    expect(cards.map((card) => card.querySelector('.author')?.textContent?.trim())).toEqual([
      'Auteur reading',
      'Auteur done',
      'Auteur new',
    ]);
    expect(cards[0].classList).toContain('book-card--current');
    expect(cards[0].querySelector('.tag')?.textContent?.trim()).toBe('En cours');
    expect(cards[1].classList).toContain('book-card--finished');
    expect(cards[1].querySelector('.tag')?.textContent?.trim()).toBe('Terminé');
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

  it('shows the unavailable screen only while the list has never loaded', async () => {
    data.unreachable.set(true);
    const element = await render();
    expect(element.textContent).toContain('Le service est indisponible');
  });
});
