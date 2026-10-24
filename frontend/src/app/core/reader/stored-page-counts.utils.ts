import { FontTier } from '@core/http/api.model';

import { MeasuredCounts } from './reader.model';

/**
 * Version of the reading typography, raised whenever reading.css changes how much a page holds, so
 * counts measured under an older style are forgotten.
 */
const TYPOGRAPHY_VERSION = 2;

/**
 * Names the layout page counts were measured under: typography, viewport size and font tier.
 *
 * @param width - Viewport width in CSS pixels.
 * @param height - Viewport height in CSS pixels.
 * @param tier - Font tier, `undefined` before the settings are known.
 * @returns Key stored next to the counts.
 */
export function layoutKey(width: number, height: number, tier: FontTier | undefined): string {
  return `v${TYPOGRAPHY_VERSION}:${width}x${height}:${tier}`;
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
