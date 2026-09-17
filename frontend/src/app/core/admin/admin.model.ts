/** Import state of a catalogue entry. */
export type CatalogueEntryState = 'not-imported' | 'active' | 'withdrawn';

/** Entry of `GET /api/admin/catalogue`. */
export interface CatalogueEntry {
  readonly entryId: string;
  readonly title: string;
  readonly author: string;
  readonly summary: string;
  readonly state: CatalogueEntryState;
}

/** Book as the backoffice library shows it. */
export interface AdminBook {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly source: 'catalogue' | 'upload';
  readonly sourceUrl: string | null;
  readonly active: boolean;
  readonly blockCount: number;
  readonly activatedAt: string;
  readonly createdAt: string;
}

/** Body of `PATCH /api/admin/books/{id}`; omitted fields stay unchanged. */
export interface BookPatch {
  readonly title?: string;
  readonly author?: string;
  readonly active?: boolean;
}
