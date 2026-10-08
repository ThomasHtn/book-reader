/**
 * Import state of a catalogue entry; `withdrawn` means imported then deactivated.
 */
export type CatalogueEntryState = 'not-imported' | 'active' | 'withdrawn';

/**
 * Entry of `GET /api/admin/catalogue`, relayed live from the OPDS search (spec section 7.2).
 */
export interface CatalogueEntry {
  /**
   * OPDS entry identifier, sent back to import the book.
   */
  readonly entryId: string;

  /**
   * Title as the catalogue spells it.
   */
  readonly title: string;

  /**
   * Author as the catalogue spells it.
   */
  readonly author: string;

  /**
   * Catalogue blurb, possibly empty.
   */
  readonly summary: string;

  /**
   * Whether the library already holds this entry, active or not.
   */
  readonly state: CatalogueEntryState;
}

/**
 * Book as the backoffice library shows it, inactive ones included.
 */
export interface AdminBook {
  /**
   * Book identifier (UUID).
   */
  readonly id: string;

  /**
   * Title, editable by the caregiver.
   */
  readonly title: string;

  /**
   * Author, editable by the caregiver.
   */
  readonly author: string;

  /**
   * Where the EPUB came from.
   */
  readonly source: 'catalogue' | 'upload';

  /**
   * Catalogue download URL, `null` for an upload.
   */
  readonly sourceUrl: string | null;

  /**
   * Whether the reader lists the book; inactive books are kept, not deleted.
   */
  readonly active: boolean;

  /**
   * Number of converted blocks, a rough size hint.
   */
  readonly blockCount: number;

  /**
   * ISO-8601 instant of the last activation, which orders never opened books in the reader.
   */
  readonly activatedAt: string;

  /**
   * ISO-8601 instant of the first import.
   */
  readonly createdAt: string;

  /**
   * ISO-8601 instant the book was marked as read, `null` while unread.
   */
  readonly finishedAt: string | null;
}

/**
 * Body of `PATCH /api/admin/books/{id}`; omitted fields stay unchanged.
 */
export interface BookPatch {
  /**
   * New title.
   */
  readonly title?: string;

  /**
   * New author.
   */
  readonly author?: string;

  /**
   * Shows or hides the book in the reader.
   */
  readonly active?: boolean;

  /**
   * Sets or clears the read mark.
   */
  readonly finished?: boolean;
}
