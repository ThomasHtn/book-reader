import { BookContent, FontTier } from '@core/http/api.model';

import { MeasuredCounts } from './reader.model';

/**
 * Names the layout page counts were measured under: typography, viewport size and font tier.
 *
 * @param typography - Fingerprint of the reading styles, from `ChapterLayout.typography()`.
 * @param width - Viewport width in CSS pixels.
 * @param height - Viewport height in CSS pixels.
 * @param tier - Font tier, `undefined` before the settings are known.
 * @returns Key stored next to the counts.
 */
export function layoutKey(
  typography: string,
  width: number,
  height: number,
  tier: FontTier | undefined,
): string {
  return `${typography}:${width}x${height}:${tier}`;
}

/**
 * Hashes a text into a short stable name, for keys only: collisions merely cost a recount.
 *
 * @param text - Text to hash.
 * @returns 32-bit hash in base 36.
 */
export function shortHash(text: string): string {
  let hash = 0;
  for (const char of text) {
    hash = (Math.imul(hash, 31) + char.codePointAt(0)!) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Names what a book's counts depend on besides the layout: its title page and its blocks. Titles and
 * authors can be edited in the backoffice, which changes the first chapter's page count.
 *
 * @param book - Book as received.
 * @returns Short hash, appended to the layout key.
 */
export function bookFingerprint(book: Pick<BookContent, 'title' | 'author' | 'blocks'>): string {
  return shortHash(`${book.title}\n${book.author}\n${book.blocks.length}`);
}

/**
 * Serializes measured counts with the layout they belong to.
 *
 * @param layout - Layout key (viewport size and font tier).
 * @param counts - Measured counts.
 * @returns JSON for `localStorage`.
 */
export function serializePageCounts(layout: string, counts: MeasuredCounts): string {
  return JSON.stringify({ layout, counts: counts.map((count) => count ?? null) });
}

/**
 * Reads stored counts, dropping them when they belong to another layout or chapter split.
 *
 * @param raw - Stored JSON.
 * @param layout - Current layout key.
 * @param chapterCount - Number of chapters of the book as received.
 * @returns One entry per chapter, `undefined` where unknown.
 */
export function parsePageCounts(
  raw: string | null,
  layout: string,
  chapterCount: number,
): (number | undefined)[] {
  const unknown = Array.from<number | undefined>({ length: chapterCount });
  try {
    const value = JSON.parse(raw ?? 'null') as {
      /**
       * Layout key the counts were measured under.
       */
      layout?: unknown;

      /**
       * One count per chapter, `null` where unknown.
       */
      counts?: unknown;
    } | null;
    const counts = value?.counts;
    if (
      value?.layout !== layout ||
      !Array.isArray(counts) ||
      counts.length !== chapterCount ||
      !counts.every((count) => count === null || (Number.isInteger(count) && count > 0))
    ) {
      return unknown;
    }
    return counts.map((count: number | null) => count ?? undefined);
  } catch {
    return unknown;
  }
}
