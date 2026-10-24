import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { AdminSettings } from './admin-settings';

describe('AdminSettings', () => {
  /**
   * Answers the settings requests.
   */
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  /**
   * Creates the page with the server at tier 32 and returns a tier button lookup.
   */
  async function render() {
    const fixture = TestBed.createComponent(AdminSettings);
    /**
     * Runs effects and HTTP callbacks, then renders; `whenStable()` would wait for unanswered requests.
     */
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();
    const element = fixture.nativeElement as HTMLElement;
    /**
     * Tier button whose label is exactly this text.
     */
    const option = (label: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find(
        (button) => button.textContent?.trim() === label,
      )!;
    return { element, settle, option };
  }

  it('shows a loader, not a default tier someone could save, until the settings arrive', async () => {
    const fixture = TestBed.createComponent(AdminSettings);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.a-loading[role="status"]')?.textContent?.trim()).toBe(
      'Chargement des réglages',
    );
    expect(element.querySelector('[role="group"]')).toBeNull();
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
  });

  it('explains settings that cannot be read and reloads them on demand', async () => {
    const fixture = TestBed.createComponent(AdminSettings);
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    http.expectOne(API_ENDPOINTS.settings).flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Échec : réglages indisponibles');
    expect(element.querySelector('[role="group"]')).toBeNull();
    element.querySelector<HTMLButtonElement>('.a-empty button')!.click();
    await settle();
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 28 });
    await settle();
    expect(element.querySelector('[aria-pressed="true"]')?.textContent?.trim()).toBe('28');
  });

  it('shows the current tier as the pressed option', async () => {
    const { element, option } = await render();

    expect(option('32').getAttribute('aria-pressed')).toBe('true');
    expect(option('36').getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelectorAll('[role="group"][aria-labelledby]')).toHaveLength(1);
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

    option('40').click();
    await settle();

    const preview = element.querySelector<HTMLElement>('.a-preview')!;
    expect(preview.style.getPropertyValue('--preview-tier')).toBe('40');
    expect(preview.textContent).toContain('Sur son écran, ce texte fait 40 px.');
  });

  it('saves the settings, which the reader applies within ten seconds', async () => {
    const { element, settle, option } = await render();
    option('28').click();
    await settle();

    const save = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === 'Enregistrer',
    )!;
    save.click();
    await settle();
    expect(save.disabled).toBe(true);
    const request = http.expectOne(API_ENDPOINTS.admin.settings);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fontTier: 28 });
    request.flush({ fontTier: 28 });
    await settle();

    expect(element.textContent).toContain(
      'Réglages enregistrés, appliqués à la liseuse dans les dix secondes',
    );
  });
});
