import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminSession, SignInOutcome } from '@core/admin/admin-session';
import { AdminShell } from './admin-shell';

class FakeSession {
  public readonly key = signal<string | null>(null);
  public outcome: SignInOutcome = 'ok';
  public attempts: string[] = [];

  public async signIn(key: string): Promise<SignInOutcome> {
    this.attempts.push(key);
    if (this.outcome === 'ok') {
      this.key.set(key);
    }
    return this.outcome;
  }

  public signOut(): void {
    this.key.set(null);
  }
}

describe('AdminShell', () => {
  let session: FakeSession;

  beforeEach(() => {
    session = new FakeSession();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AdminSession, useValue: session }],
    });
  });

  afterEach(() => document.documentElement.removeAttribute('data-density'));

  async function render() {
    const fixture = TestBed.createComponent(AdminShell);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function signIn(
    element: HTMLElement,
    fixture: { whenStable(): Promise<unknown>; detectChanges(): void },
    key: string,
  ) {
    const input = element.querySelector<HTMLInputElement>('input[type="password"]')!;
    input.value = key;
    input.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('switches the document to the backoffice density and restores it on leave', async () => {
    const { fixture } = await render();
    expect(document.documentElement.dataset['density']).toBe('admin');
    fixture.destroy();
    expect(document.documentElement.dataset['density']).toBeUndefined();
  });

  it('asks for the key with a labelled password field and an "Entrer" button', async () => {
    const { element } = await render();

    const input = element.querySelector<HTMLInputElement>('input[type="password"]')!;
    expect(element.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()).toBe(
      "Clé d'administration",
    );
    expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Entrer');
    expect(element.querySelector('nav')).toBeNull();
  });

  it('opens the backoffice once the key is accepted', async () => {
    const { element, fixture } = await render();

    await signIn(element, fixture, 'good-key');

    expect(session.attempts).toEqual(['good-key']);
    expect(element.querySelector('input[type="password"]')).toBeNull();
    const links = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Catalogue',
      'Bibliothèque',
      'Dépôt',
      'Réglages',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/catalogue',
      '/admin/bibliotheque',
      '/admin/depot',
      '/admin/reglages',
    ]);
  });

  it('explains a refused key under the field', async () => {
    const { element, fixture } = await render();
    const messages: [SignInOutcome, string][] = [
      ['invalid', 'Clé incorrecte'],
      ['locked', "Trop d'essais, réessayez dans une minute"],
      ['unreachable', 'Serveur injoignable'],
    ];
    for (const [outcome, message] of messages) {
      session.outcome = outcome;
      await signIn(element, fixture, 'bad');
      expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(message);
    }
  });

  it('signs out from the header', async () => {
    session.key.set('good-key');
    const { element, fixture } = await render();

    const button = [...element.querySelectorAll<HTMLButtonElement>('header button')].find(
      (candidate) => candidate.textContent?.trim() === 'Se déconnecter',
    )!;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(session.key()).toBeNull();
    expect(element.querySelector('input[type="password"]')).not.toBeNull();
  });
});
