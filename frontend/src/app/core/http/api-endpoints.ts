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

  /** Backoffice routes, all guarded by the `X-Admin-Key` header that `adminKeyInterceptor` attaches. */
  admin: {
    /** `GET` a confirmation that the key is accepted; changes nothing. */
    session: '/api/admin/session',

    /** `GET` a live search relayed to the OPDS catalogue, `?query=`. */
    catalogue: '/api/admin/catalogue',

    /** `POST` `{ entryId }`: download, convert and activate, or reactivate. */
    fromCatalogue: '/api/admin/books/from-catalogue',

    /** `POST` multipart `file`: convert and activate an EPUB. */
    upload: '/api/admin/books/upload',

    /** `GET` every imported book. */
    books: '/api/admin/books',

    /**
     * `PATCH` title, author or activation of a book.
     *
     * @param bookId - Book identifier.
     * @returns The endpoint URL.
     */
    book: (bookId: string): string => `/api/admin/books/${encodeURIComponent(bookId)}`,

    /** `PUT` global display settings. */
    settings: '/api/admin/settings',
  },
} as const;
