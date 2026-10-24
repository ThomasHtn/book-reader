import { AdminBook } from '@core/admin/admin.model';

import { StateFilter, StateFilterOption } from './admin-library.model';

/**
 * State filters, in the order of the segmented control.
 */
export const STATE_FILTERS: readonly StateFilterOption[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'withdrawn', label: 'Retirés' },
  { value: 'finished', label: 'Lus' },
];

/**
 * Which books each state filter keeps.
 */
export const MATCHES: Readonly<Record<StateFilter, (book: AdminBook) => boolean>> = {
  all: () => true,
  active: (book) => book.active,
  withdrawn: (book) => !book.active,
  finished: (book) => Boolean(book.finishedAt),
};
