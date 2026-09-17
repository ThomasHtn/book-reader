import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminBook } from '@core/admin/admin.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { AdminLibrary } from './admin-library';

const BOOKS: AdminBook[] = [
  {
    id: 'b1',
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    source: 'catalogue',
    sourceUrl: 'https://www.ebooksgratuits.com/details.php?book=476',
    active: true,
    blockCount: 10,
    activatedAt: '2026-09-17T08:00:00Z',
    createdAt: '2026-09-17T08:00:00Z',
  },
  {
    id: 'b2',
    title: 'LES FLEURS DU MAL',
    author: 'Charles Baudelaire',
    source: 'upload',
    sourceUrl: null,
    active: false,
    blockCount: 10,
    activatedAt: '2026-09-02T08:00:00Z',
    createdAt: '2026-09-02T08:00:00Z',
  },
];

describe('AdminLibrary', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(AdminLibrary);
    // whenStable() would wait for the very requests the test has to answer.
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    http.expectOne(API_ENDPOINTS.admin.books).flush(BOOKS);
    await settle();
    const element = fixture.nativeElement as HTMLElement;
    const item = (title: string) =>
      [...element.querySelectorAll<HTMLElement>('.a-item')].find((candidate) =>
        candidate.textContent?.includes(title),
      )!;
    const button = (container: HTMLElement, label: string) =>
      [...container.querySelectorAll<HTMLButtonElement>('button')].find(
        (candidate) => candidate.textContent?.trim() === label,
      )!;
    return { element, settle, item, button };
  }

  it('lists every imported book with author, source, date and state', async () => {
    const { item } = await render();

    expect(item('Le Horla').textContent).toContain(
      'Guy de Maupassant, catalogue, ajouté le 17 septembre 2026',
    );
    expect(item('Le Horla').textContent).toContain('Active');
    expect(item('LES FLEURS DU MAL').textContent).toContain(
      'Charles Baudelaire, dépôt, ajouté le 2 septembre 2026',
    );
    expect(item('LES FLEURS DU MAL').textContent).toContain('Retiré');
  });

  it('withdraws an active book and reactivates a withdrawn one', async () => {
    const { element, settle, item, button } = await render();

    button(item('Le Horla'), 'Retirer').click();
    await settle();
    const withdraw = http.expectOne(API_ENDPOINTS.admin.book('b1'));
    expect(withdraw.request.method).toBe('PATCH');
    expect(withdraw.request.body).toEqual({ active: false });
    withdraw.flush({ ...BOOKS[0], active: false });
    await settle();
    http.expectOne(API_ENDPOINTS.admin.books).flush([{ ...BOOKS[0], active: false }, BOOKS[1]]);
    await settle();
    expect(element.textContent).toContain('Livre retiré : Le Horla');

    button(item('LES FLEURS DU MAL'), 'Réactiver').click();
    await settle();
    expect(http.expectOne(API_ENDPOINTS.admin.book('b2')).request.body).toEqual({ active: true });
  });

  it('corrects title and author', async () => {
    const { element, settle, item, button } = await render();

    button(item('LES FLEURS DU MAL'), 'Modifier').click();
    await settle();
    const title = element.querySelector<HTMLInputElement>('input[name="title"]')!;
    const author = element.querySelector<HTMLInputElement>('input[name="author"]')!;
    expect(title.value).toBe('LES FLEURS DU MAL');
    title.value = 'Les Fleurs du mal';
    title.dispatchEvent(new Event('input'));
    author.value = 'Baudelaire';
    author.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('form button[type="submit"]')!.click();
    await settle();

    const patch = http.expectOne(API_ENDPOINTS.admin.book('b2'));
    expect(patch.request.body).toEqual({ title: 'Les Fleurs du mal', author: 'Baudelaire' });
    patch.flush({ ...BOOKS[1], title: 'Les Fleurs du mal', author: 'Baudelaire' });
    await settle();
    http.expectOne(API_ENDPOINTS.admin.books).flush(BOOKS);
    await settle();
    expect(element.textContent).toContain('Titre et auteur enregistrés');
    expect(element.querySelector('form')).toBeNull();
  });

  it('explains a failed change', async () => {
    const { element, settle, item, button } = await render();

    button(item('Le Horla'), 'Retirer').click();
    await settle();
    http
      .expectOne(API_ENDPOINTS.admin.book('b1'))
      .flush(null, { status: 0, statusText: 'offline' });
    await settle();

    expect(element.textContent).toContain('Échec : serveur injoignable');
  });
});
