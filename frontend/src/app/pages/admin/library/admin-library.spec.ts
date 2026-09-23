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
    finishedAt: null,
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
    finishedAt: '2026-09-10T08:00:00Z',
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

  it('shows a loader until the list arrives', async () => {
    const fixture = TestBed.createComponent(AdminLibrary);
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.a-loading[role="status"]')?.textContent?.trim()).toBe(
      'Chargement de la bibliothèque',
    );

    http.expectOne(API_ENDPOINTS.admin.books).flush(BOOKS);
    await settle();
    expect(element.querySelector('.a-loading')).toBeNull();
  });

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

  it('filters by title or author, ignoring case and accents', async () => {
    const { element, settle } = await render();
    const filter = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    const titles = () =>
      [...element.querySelectorAll('.a-item .t')].map((title) => title.textContent?.trim());

    filter.value = 'baudélaire';
    filter.dispatchEvent(new Event('input'));
    await settle();
    expect(titles()).toEqual(['LES FLEURS DU MAL']);

    filter.value = 'personne';
    filter.dispatchEvent(new Event('input'));
    await settle();
    expect(titles()).toEqual([]);
    expect(element.textContent).toContain('Aucun livre ne correspond');
  });

  it('filters by state and counts each state', async () => {
    const { element, settle } = await render();
    const group = element.querySelector<HTMLElement>('[role="group"]')!;
    const option = (label: string) =>
      [...group.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.trim().startsWith(label),
      )!;
    const titles = () =>
      [...element.querySelectorAll('.a-item .t')].map((title) => title.textContent?.trim());

    expect(option('Tous').textContent).toContain('2');
    expect(option('Actifs').textContent).toContain('1');
    option('Retirés').click();
    await settle();
    expect(option('Retirés').getAttribute('aria-pressed')).toBe('true');
    expect(titles()).toEqual(['LES FLEURS DU MAL']);
    option('Lus').click();
    await settle();
    expect(titles()).toEqual(['LES FLEURS DU MAL']);
    option('Tous').click();
    await settle();
    expect(titles()).toEqual(['Le Horla', 'LES FLEURS DU MAL']);
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

  it('marks a book as read and a read one as unread', async () => {
    const { element, settle, item, button } = await render();
    const chips = (title: string) =>
      [...item(title).querySelectorAll('.a-chip')].map((chip) => chip.textContent?.trim());
    expect(chips('LES FLEURS DU MAL')).toEqual(['Retiré', 'Lu']);
    expect(chips('Le Horla')).toEqual(['Active']);

    button(item('Le Horla'), 'Marquer comme lu').click();
    await settle();
    const mark = http.expectOne(API_ENDPOINTS.admin.book('b1'));
    expect(mark.request.method).toBe('PATCH');
    expect(mark.request.body).toEqual({ finished: true });
    mark.flush({ ...BOOKS[0], finishedAt: '2026-09-23T08:00:00Z' });
    await settle();
    http.expectOne(API_ENDPOINTS.admin.books).flush(BOOKS);
    await settle();
    expect(element.textContent).toContain('Livre marqué comme lu : Le Horla');

    button(item('LES FLEURS DU MAL'), 'Marquer comme non lu').click();
    await settle();
    expect(http.expectOne(API_ENDPOINTS.admin.book('b2')).request.body).toEqual({
      finished: false,
    });
  });

  it('deletes a book only after confirmation', async () => {
    const { element, settle, item, button } = await render();

    button(item('Le Horla'), 'Supprimer').click();
    await settle();
    expect(item('Le Horla').textContent).toContain('Supprimer définitivement ce livre ?');
    button(item('Le Horla'), 'Annuler').click();
    await settle();
    http.expectNone(API_ENDPOINTS.admin.book('b1'));

    button(item('Le Horla'), 'Supprimer').click();
    await settle();
    button(item('Le Horla'), 'Confirmer la suppression').click();
    await settle();
    const deletion = http.expectOne(API_ENDPOINTS.admin.book('b1'));
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne(API_ENDPOINTS.admin.books).flush([BOOKS[1]]);
    await settle();
    expect(element.textContent).toContain('Livre supprimé : Le Horla');
    expect(element.textContent).not.toContain('Guy de Maupassant');
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
