/** Backend routes consumed by the application; components never build URLs. */
export const API_ENDPOINTS = {
  /** `GET` active books. */
  books: '/api/books',

  /**
   * `GET` one active book in the internal format.
   *
   * @param bookId - Book identifier.
   * @returns The endpoint URL.
   */
  book: (bookId: string): string => `/api/books/${encodeURIComponent(bookId)}`,

  /** `GET` global display settings. */
  settings: '/api/settings',
} as const;
