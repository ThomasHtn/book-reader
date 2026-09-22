import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { BookSummary } from '@core/http/api.model';
import { POLL_INTERVAL_MS, ReaderData } from './reader-data';

const BOOKS: BookSummary[] = [
  { id: 'a', title: 'Le Horla', author: 'Guy de Maupassant', activatedAt: '2026-09-17T10:00:00Z' },
];

describe('ReaderData', () => {
  let http: HttpTestingController;
  let data: ReaderData;

  // whenStable() never settles with a pending interval under fake timers: flush explicitly.
  const settle = async () => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
    TestBed.tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    data = TestBed.inject(ReaderData);
    TestBed.tick();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute('data-tier');
  });

  it('loads books and settings, then applies the tier to the document', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 140 });
    await settle();

    expect(data.books()).toEqual(BOOKS);
    expect(data.unreachable()).toBe(false);
    expect(document.documentElement.dataset['tier']).toBe('140');
  });

  it('polls both resources every ten seconds', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 100 });
    await settle();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    TestBed.tick();

    http.expectOne(API_ENDPOINTS.books).flush([]);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 72 });
    await settle();
    expect(data.books()).toEqual([]);
    expect(document.documentElement.dataset['tier']).toBe('72');
  });

  it('keeps the last valid response when a poll fails', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 100 });
    await settle();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.books).error(new ProgressEvent('offline'));
    http.expectOne(API_ENDPOINTS.settings).error(new ProgressEvent('offline'));
    await settle();

    expect(data.books()).toEqual(BOOKS);
    expect(data.unreachable()).toBe(false);
    expect(document.documentElement.dataset['tier']).toBe('100');
  });

  it('reports the server unreachable while the book list has never loaded, and retries', async () => {
    http.expectOne(API_ENDPOINTS.books).error(new ProgressEvent('offline'));
    http.expectOne(API_ENDPOINTS.settings).error(new ProgressEvent('offline'));
    await settle();

    expect(data.books()).toBeUndefined();
    expect(data.unreachable()).toBe(true);

    data.retry();
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 100 });
    await settle();
    expect(data.unreachable()).toBe(false);
  });
});
