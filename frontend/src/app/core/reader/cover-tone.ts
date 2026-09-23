/** Number of cover colours, matching `--book-cover-1` to `--book-cover-10` in tokens.css. */
export const COVER_TONES = 10;

/**
 * Cover colour of a book, from 1 to {@link COVER_TONES}. Derived from the id alone, so a book keeps
 * its colour whatever its place in the list: the reader can find it by colour before reading it.
 */
export function coverTone(bookId: string): number {
  // FNV-1a: mixes UUIDs well enough that neighbours rarely share a cloth
  let hash = 0x811c9dc5;
  for (const char of bookId) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return (hash % COVER_TONES) + 1;
}

/**
 * Cloths of a grid in reading order: each book keeps its own tone unless the book on its left or
 * the one above it already wears it, then takes the next free tone. A book changes colour only on
 * such a clash, so colour stays a reliable cue while no two neighbours ever match.
 *
 * @param ids - Book ids in grid order, `null` for a book shown without cloth (current, finished).
 * @param columns - Books per row.
 * @returns The tone of every book, `null` where the id is `null`.
 */
export function assignCoverTones(
  ids: readonly (string | null)[],
  columns: number,
): (number | null)[] {
  const tones: (number | null)[] = [];
  ids.forEach((id, index) => {
    if (id === null) {
      tones.push(null);
      return;
    }
    const left = index % columns > 0 ? tones[index - 1] : null;
    const above = index >= columns ? tones[index - columns] : null;
    let tone = coverTone(id);
    while (tone === left || tone === above) {
      tone = (tone % COVER_TONES) + 1;
    }
    tones.push(tone);
  });
  return tones;
}
