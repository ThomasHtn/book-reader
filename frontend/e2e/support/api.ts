import { APIRequestContext, APIResponse, Page } from '@playwright/test';

import { E2E_ADMIN_KEY } from './env';
import { buildEpub, TestBook } from './epub';

/**
 * Uploads a generated EPUB through the backoffice API, which activates it at once.
 *
 * @param request - Request context of the page or the test.
 * @param book - Book to generate.
 * @returns Response of `POST /api/admin/books/upload`.
 */
export function uploadBook(request: APIRequestContext, book: TestBook): Promise<APIResponse> {
  return request.post('/api/admin/books/upload', {
    headers: { 'X-Admin-Key': E2E_ADMIN_KEY },
    multipart: {
      file: { name: 'book.epub', mimeType: 'application/epub+zip', buffer: buildEpub(book) },
    },
  });
}

/**
 * Stores a reading position for a book, as the reader would; the page must already be on the app.
 *
 * @param page - Page on the app's origin.
 * @param bookId - Book identifier.
 * @param blockIndex - Block the position starts at.
 */
export async function seedProgress(page: Page, bookId: string, blockIndex: number): Promise<void> {
  await page.evaluate(
    ([id, block]) => {
      localStorage.setItem(
        `reader.progress.${id}`,
        JSON.stringify({
          blockIndex: block,
          charOffset: 0,
          finished: false,
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [bookId, blockIndex] as const,
  );
}
