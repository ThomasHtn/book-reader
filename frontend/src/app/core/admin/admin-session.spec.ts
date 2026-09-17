import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BROWSER_STORAGE } from '@core/reader/progress-store';
import { AdminSession } from './admin-session';

describe('AdminSession', () => {
  let storage: Map<string, string>;
  let http: HttpTestingController;

  function create(): AdminSession {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BROWSER_STORAGE,
          useValue: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AdminSession);
  }

  beforeEach(() => {
    storage = new Map();
  });

  it('checks the key once, then remembers it in the browser', async () => {
    const session = create();
    const outcome = session.signIn('secret-key');

    const request = http.expectOne(API_ENDPOINTS.admin.session);
    expect(request.request.headers.get('X-Admin-Key')).toBe('secret-key');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await outcome).toBe('ok');
    expect(session.key()).toBe('secret-key');
    expect(storage.get('admin.key')).toBe('secret-key');
  });

  it('restores a remembered key', () => {
    storage.set('admin.key', 'remembered');
    expect(create().key()).toBe('remembered');
  });

  it('reports a wrong key, a lockout and an unreachable server without remembering anything', async () => {
    const session = create();
    const cases: [number, string][] = [
      [403, 'invalid'],
      [401, 'invalid'],
      [429, 'locked'],
      [0, 'unreachable'],
    ];
    for (const [status, expected] of cases) {
      const outcome = session.signIn('wrong');
      http.expectOne(API_ENDPOINTS.admin.session).flush(null, { status, statusText: 'x' });
      expect(await outcome).toBe(expected);
    }
    expect(session.key()).toBeNull();
    expect(storage.has('admin.key')).toBe(false);
  });

  it('forgets the key on sign out', async () => {
    storage.set('admin.key', 'remembered');
    const session = create();

    session.signOut();

    expect(session.key()).toBeNull();
    expect(storage.has('admin.key')).toBe(false);
  });
});
