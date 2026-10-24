import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BookSummary } from '@core/http/api.model';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { POLL_INTERVAL_MS } from './reader.constants';
import { ReaderData } from './reader-data';

/**
 * Book list the fake backend serves.
 */
const BOOKS: BookSummary[] = [
  {
    id: 'a',
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    activatedAt: '2026-09-17T10:00:00Z',
    finishedAt: null,
  },
];

describe('ReaderData', () => {
  /**
   * Backend double answering the polls.
   */
  let http: HttpTestingController;

  /**
   * Service under test, created before each test so its first requests are pending.
   */
  let data: ReaderData;

  /**
   * Lets responses reach the signals; `whenStable()` never settles with the poll interval pending.
   */
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
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 40 });
    await settle();

    expect(data.books()).toEqual(BOOKS);
    expect(data.unreachable()).toBe(false);
    expect(document.documentElement.dataset['tier']).toBe('40');
  });

  it('polls both resources every ten seconds', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    TestBed.tick();

    http.expectOne(API_ENDPOINTS.books).flush([]);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 28 });
    await settle();
    expect(data.books()).toEqual([]);
    expect(document.documentElement.dataset['tier']).toBe('28');
  });

  it('keeps the same list object when a poll brings the same books, so nothing renders again', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();
    const first = data.books();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.books).flush(structuredClone(BOOKS));
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();

    expect(data.books()).toBe(first);
  });

  it('keeps the last valid response when a poll fails', async () => {
    http.expectOne(API_ENDPOINTS.books).flush(BOOKS);
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.books).error(new ProgressEvent('offline'));
    http.expectOne(API_ENDPOINTS.settings).error(new ProgressEvent('offline'));
    await settle();

    expect(data.books()).toEqual(BOOKS);
    expect(data.unreachable()).toBe(false);
    expect(document.documentElement.dataset['tier']).toBe('32');
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
    http.expectOne(API_ENDPOINTS.settings).flush({ fontTier: 32 });
    await settle();
    expect(data.unreachable()).toBe(false);
  });
});
