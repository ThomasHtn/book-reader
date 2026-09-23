import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { Upload } from './upload';

describe('Upload', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(Upload);
    // whenStable() would wait for the very requests the test has to answer.
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    const element = fixture.nativeElement as HTMLElement;
    const send = () => element.querySelector<HTMLButtonElement>('button.a-btn--primary')!;
    const choose = async (...files: File[]) => {
      const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      input.dispatchEvent(new Event('change'));
      await settle();
    };
    return { element, settle, send, choose };
  }

  it('accepts EPUB files through a labelled file field', async () => {
    const { element, send } = await render();

    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toContain('.epub');
    expect(input.multiple).toBe(true);
    expect(element.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    expect(send().disabled).toBe(true);
  });

  it('sends the chosen file, busy while converting, then confirms', async () => {
    const { element, settle, send, choose } = await render();
    const file = new File(['PK'], 'horla.epub', { type: 'application/epub+zip' });

    await choose(file);
    expect(element.textContent).toContain('horla.epub');
    send().click();
    await settle();
    expect(send().disabled).toBe(true);
    expect(send().getAttribute('aria-busy')).toBe('true');
    expect(send().textContent?.trim()).toBe('Envoi en cours');
    expect(send().querySelector('svg.a-spin')).not.toBeNull();

    const request = http.expectOne(API_ENDPOINTS.admin.upload);
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('file')).toBe(file);
    request.flush({ id: 'b1', title: 'Le Horla' }, { status: 201, statusText: 'Created' });
    await settle();

    expect(element.textContent).toContain('Livre ajouté et activé : Le Horla');
  });

  it('sends several chosen files, one request each, then confirms all of them', async () => {
    const { element, settle, send, choose } = await render();
    const first = new File(['PK'], 'horla.epub', { type: 'application/epub+zip' });
    const second = new File(['PK'], 'boule-de-suif.epub', { type: 'application/epub+zip' });

    await choose(first, second);
    expect(element.textContent).toContain('2 fichiers sélectionnés');
    send().click();
    await settle();

    const firstRequest = http.expectOne(API_ENDPOINTS.admin.upload);
    expect((firstRequest.request.body as FormData).get('file')).toBe(first);
    firstRequest.flush({ id: 'b1', title: 'Le Horla' }, { status: 201, statusText: 'Created' });
    await settle();

    const secondRequest = http.expectOne(API_ENDPOINTS.admin.upload);
    expect(send().textContent?.trim()).toBe('Envoi 2 sur 2');
    expect((secondRequest.request.body as FormData).get('file')).toBe(second);
    secondRequest.flush(
      { id: 'b2', title: 'Boule de suif' },
      { status: 201, statusText: 'Created' },
    );
    await settle();

    expect(element.textContent).toContain('2 livres ajoutés et activés : Le Horla, Boule de suif');
  });

  it('reports per-file failures without losing the successful uploads', async () => {
    const { element, settle, send, choose } = await render();
    const good = new File(['PK'], 'horla.epub', { type: 'application/epub+zip' });
    const bad = new File(['x'], 'big.epub');

    await choose(good, bad);
    send().click();
    await settle();

    http
      .expectOne(API_ENDPOINTS.admin.upload)
      .flush({ id: 'b1', title: 'Le Horla' }, { status: 201, statusText: 'Created' });
    await settle();
    http
      .expectOne(API_ENDPOINTS.admin.upload)
      .flush({ code: 'EPUB_TOO_LARGE' }, { status: 413, statusText: 'Too large' });
    await settle();

    expect(element.textContent).toContain('1 livre(s) ajouté(s) : Le Horla');
    expect(element.textContent).toContain('Échec : big.epub (le fichier dépasse 20 Mo)');
  });

  it('explains a refused file', async () => {
    const { element, settle, send, choose } = await render();
    await choose(new File(['x'], 'big.epub'));

    send().click();
    await settle();
    http
      .expectOne(API_ENDPOINTS.admin.upload)
      .flush({ code: 'EPUB_TOO_LARGE' }, { status: 413, statusText: 'Too large' });
    await settle();

    expect(element.textContent).toContain('Échec : le fichier dépasse 20 Mo');
    expect(send().disabled).toBe(false);
  });
});
