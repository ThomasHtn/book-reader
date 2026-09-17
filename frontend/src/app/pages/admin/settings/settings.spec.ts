import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { Settings } from './settings';

describe('Settings', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(Settings);
    // whenStable() would wait for the very requests the test has to answer.
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 100, theme: 'dark-on-light' });
    await settle();
    const element = fixture.nativeElement as HTMLElement;
    const option = (label: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find(
        (button) => button.textContent?.trim() === label,
      )!;
    return { element, settle, option };
  }

  it('shows the current tier and theme as pressed options', async () => {
    const { element, option } = await render();

    expect(option('100').getAttribute('aria-pressed')).toBe('true');
    expect(option('48').getAttribute('aria-pressed')).toBe('false');
    expect(option('Noir sur blanc').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelectorAll('[role="group"][aria-labelledby]')).toHaveLength(2);
  });

  it('credits the fonts and the book source, as their licences require', async () => {
    const { element } = await render();

    const credits = element.querySelector('footer')!.textContent!;
    expect(credits).toContain('Luciole');
    expect(credits).toContain('CC BY 4.0');
    expect(credits).toContain('Atkinson Hyperlegible Next');
    expect(credits).toContain('SIL Open Font License');
    expect(credits).toContain('Ebooks libres et gratuits');
  });

  it('previews the choice with its real size on her screen', async () => {
    const { element, settle, option } = await render();

    option('140').click();
    option('Jaune sur noir').click();
    await settle();

    const preview = element.querySelector<HTMLElement>('.a-preview')!;
    expect(preview.dataset['theme']).toBe('yellow-on-black');
    expect(preview.style.getPropertyValue('--preview-tier')).toBe('140');
    expect(preview.textContent).toContain('Sur son écran, ce texte fait 140 px.');
  });

  it('saves the settings, which the reader applies within ten seconds', async () => {
    const { element, settle, option } = await render();
    option('72').click();
    option('Blanc sur noir').click();
    await settle();

    const save = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === 'Enregistrer',
    )!;
    save.click();
    await settle();
    expect(save.disabled).toBe(true);
    const request = http.expectOne(API_ENDPOINTS.admin.settings);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fontTier: 72, theme: 'light-on-dark' });
    request.flush({ fontTier: 72, theme: 'light-on-dark' });
    await settle();

    expect(element.textContent).toContain(
      'Réglages enregistrés, appliqués à la liseuse dans les dix secondes',
    );
  });
});
