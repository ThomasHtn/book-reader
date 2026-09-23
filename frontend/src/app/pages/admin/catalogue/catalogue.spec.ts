import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { CatalogueEntry } from '@core/admin/admin.model';
import { Catalogue } from './catalogue';

const ENTRIES: CatalogueEntry[] = [
  {
    entryId: 'e1',
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    summary: 'Un journal.',
    state: 'not-imported',
  },
  {
    entryId: 'e2',
    title: 'Fantine',
    author: 'Victor Hugo',
    summary: 'Jean Valjean.',
    state: 'active',
  },
  {
    entryId: 'e3',
    title: 'Boule de Suif',
    author: 'Guy de Maupassant',
    summary: '',
    state: 'withdrawn',
  },
];

describe('Catalogue', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(Catalogue);
    // whenStable() would wait for the very requests the test has to answer.
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    return { element: fixture.nativeElement as HTMLElement, settle };
  }

  async function search(element: HTMLElement, settle: () => Promise<void>, query: string) {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await settle();
  }

  const card = (element: HTMLElement, title: string) =>
    [...element.querySelectorAll<HTMLElement>('.a-card')].find((candidate) =>
      candidate.textContent?.includes(title),
    )!;

  it('relays the search and shows each entry with the action its state allows', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'maupassant');

    const request = http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue);
    expect(request.request.params.get('query')).toBe('maupassant');
    request.flush(ENTRIES);
    await settle();

    expect(element.querySelectorAll('.a-card')).toHaveLength(3);
    expect(card(element, 'Le Horla').textContent).toContain('Guy de Maupassant');
    expect(card(element, 'Le Horla').textContent).toContain('Un journal.');
    expect(card(element, 'Le Horla').querySelector('button')?.textContent?.trim()).toBe('Activer');
    expect(card(element, 'Fantine').querySelector('button')).toBeNull();
    expect(card(element, 'Fantine').textContent).toContain('Déjà active');
    expect(card(element, 'Boule de Suif').querySelector('button')?.textContent?.trim()).toBe(
      'Activer',
    );
  });

  it('shows a loader while the site answers', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'maupassant');

    expect(element.querySelector('.a-loading[role="status"]')?.textContent?.trim()).toBe(
      'Recherche de « maupassant » dans le catalogue',
    );
    http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue).flush([]);
    await settle();
    expect(element.querySelector('.a-loading')).toBeNull();
  });

  it('says when nothing matches', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'zzz');
    http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue).flush([]);
    await settle();

    expect(element.textContent).toContain('Aucun résultat');
  });

  it('activates an entry, busy while the server downloads and converts it', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'horla');
    http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue).flush(ENTRIES);
    await settle();

    card(element, 'Le Horla').querySelector<HTMLButtonElement>('button')!.click();
    await settle();
    const busy = card(element, 'Le Horla').querySelector<HTMLButtonElement>('button')!;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(busy.textContent?.trim()).toBe('Activation en cours');
    expect(busy.querySelector('svg.a-spin')).not.toBeNull();

    const activation = http.expectOne(API_ENDPOINTS.admin.fromCatalogue);
    expect(activation.request.method).toBe('POST');
    expect(activation.request.body).toEqual({ entryId: 'e1' });
    activation.flush({ id: 'b1', title: 'Le Horla' }, { status: 201, statusText: 'Created' });
    await settle();

    expect(card(element, 'Le Horla').textContent).toContain('Livre activé');
    expect(card(element, 'Le Horla').textContent).toContain('Déjà active');
  });

  it('explains a failed activation and lets it be tried again', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'horla');
    http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue).flush(ENTRIES);
    await settle();

    card(element, 'Le Horla').querySelector<HTMLButtonElement>('button')!.click();
    await settle();
    http
      .expectOne(API_ENDPOINTS.admin.fromCatalogue)
      .flush({ code: 'EPUB_ENCRYPTED' }, { status: 422, statusText: 'Unprocessable' });
    await settle();

    expect(card(element, 'Le Horla').textContent).toContain('Échec : le fichier est chiffré (DRM)');
    expect(card(element, 'Le Horla').querySelector<HTMLButtonElement>('button')?.disabled).toBe(
      false,
    );
  });

  it('offers to retry when the catalogue site is unreachable', async () => {
    const { element, settle } = await render();
    await search(element, settle, 'hugo');
    http
      .expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue)
      .flush({ code: 'CATALOGUE_UNAVAILABLE' }, { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(element.textContent).toContain('Site du catalogue injoignable');
    const retry = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Réessayer',
    )!;
    retry.click();
    await settle();
    http.expectOne((r) => r.url === API_ENDPOINTS.admin.catalogue).flush(ENTRIES);
    await settle();
    expect(element.querySelectorAll('.a-card')).toHaveLength(3);
  });
});
