import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
    const rows = [...element.querySelectorAll<HTMLButtonElement>('button.row')];

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Mes livres');
    expect(rows.map((row) => row.querySelector('.title')?.firstChild?.textContent?.trim())).toEqual(
      ['Titre reading', 'Titre done', 'Titre new'],
    );
    expect(rows[0].classList).toContain('row--current');
    expect(rows[0].querySelector('.author')?.textContent).toBe('Auteur reading');
    expect(rows[0].querySelector('.tag')).toBeNull();
    expect(rows[1].classList).toContain('row--finished');
    expect(rows[1].querySelector('.tag')?.textContent?.trim()).toBe('Terminé');
    expect(rows[2].classList).not.toContain('row--current');
  });

  it('opens a book from its row', async () => {
    data.books.set([book('a')]);
    const element = await render();

    element.querySelector<HTMLButtonElement>('button.row')!.click();

    expect(navigate).toHaveBeenCalledWith('/lire/a');
  });

  it('shows the range of titles and disables both bars when everything fits on one page', async () => {
    data.books.set([book('a'), book('b'), book('c')]);
    const element = await render();

    expect(element.querySelector('[aria-live]')?.textContent?.trim()).toBe('Titres 1 à 3 sur 3');
    const bars = [...element.querySelectorAll('button.nav-bar')];
    expect(bars.map((bar) => bar.getAttribute('aria-disabled'))).toEqual(['true', 'true']);
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Titres précédents',
      'Titres suivants',
    ]);
  });

  it('shows the unavailable screen only while the list has never loaded', async () => {
    data.unreachable.set(true);
    const element = await render();
    expect(element.textContent).toContain('Le service est indisponible');
  });
});
