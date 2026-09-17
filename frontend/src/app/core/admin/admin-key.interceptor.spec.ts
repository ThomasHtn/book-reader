import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { adminKeyInterceptor } from './admin-key.interceptor';
import { AdminSession } from './admin-session';

describe('adminKeyInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  const session = { key: signal<string | null>('secret-key'), signOut: vi.fn() };

  beforeEach(() => {
    session.key.set('secret-key');
    session.signOut.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([adminKeyInterceptor])),
        provideHttpClientTesting(),
        { provide: AdminSession, useValue: session },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  it('sends the remembered key to administrative routes only', () => {
    client.get('/api/admin/books').subscribe();
    client.get('/api/books').subscribe();

    expect(http.expectOne('/api/admin/books').request.headers.get('X-Admin-Key')).toBe(
      'secret-key',
    );
    expect(http.expectOne('/api/books').request.headers.has('X-Admin-Key')).toBe(false);
  });

  it('keeps a key set explicitly on the request', () => {
    client.get('/api/admin/session', { headers: { 'X-Admin-Key': 'candidate' } }).subscribe();

    expect(http.expectOne('/api/admin/session').request.headers.get('X-Admin-Key')).toBe(
      'candidate',
    );
  });

  it('signs out when the server no longer accepts the remembered key', async () => {
    const call = firstValueFrom(client.get('/api/admin/books')).catch(() => undefined);
    http.expectOne('/api/admin/books').flush(null, { status: 403, statusText: 'Forbidden' });
    await call;

    expect(session.signOut).toHaveBeenCalled();
  });

  it('keeps the session on other failures', async () => {
    const call = firstValueFrom(client.get('/api/admin/catalogue')).catch(() => undefined);
    http.expectOne('/api/admin/catalogue').flush(null, { status: 503, statusText: 'Unavailable' });
    await call;

    expect(session.signOut).not.toHaveBeenCalled();
  });
});
