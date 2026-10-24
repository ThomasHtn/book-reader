import { AdminBook } from '@core/admin/admin.model';

/**
 * Date of addition as the caregiver reads it, on French time whatever the browser's zone.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/**
 * Lower case without diacritics, so "baudélaire" finds "Baudelaire".
 */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Line under a book's title: author, origin and date of addition.
 *
 * @returns "<auteur>, <catalogue|dépôt>, ajouté le <date>".
 */
export function bookMeta(book: AdminBook): string {
  const source = book.source === 'catalogue' ? 'catalogue' : 'dépôt';
  return `${book.author}, ${source}, ajouté le ${DATE_FORMAT.format(new Date(book.createdAt))}`;
}
