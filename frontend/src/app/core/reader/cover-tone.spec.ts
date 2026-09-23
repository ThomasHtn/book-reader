import { describe, expect, it } from 'vitest';
import { assignCoverTones, COVER_TONES, coverTone } from './cover-tone';

describe('coverTone', () => {
  it('gives the same book the same tone every time', () => {
    const id = 'a79b2ce8-099a-430c-948e-15b8417fec57';
    expect(coverTone(id)).toBe(coverTone(id));
  });

  it('stays within the tone range', () => {
    for (const id of ['', 'a', 'zz', '677eb339-e68f-42b9-82db-93530752173d']) {
      const tone = coverTone(id);
      expect(Number.isInteger(tone)).toBe(true);
      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(COVER_TONES);
    }
  });

  it('offers ten cloths', () => {
    expect(COVER_TONES).toBe(10);
  });

  it('spreads a library over every tone', () => {
    const ids = Array.from({ length: 200 }, (_, index) => `book-${index}`);
    expect(new Set(ids.map(coverTone)).size).toBe(COVER_TONES);
  });
});

describe('assignCoverTones', () => {
  /** Ids whose own tone is `tone`, found by trying candidates. */
  function idsWithTone(tone: number, count: number): string[] {
    const ids: string[] = [];
    for (let index = 0; ids.length < count; index++) {
      if (coverTone(`id-${index}`) === tone) {
        ids.push(`id-${index}`);
      }
    }
    return ids;
  }

  it('keeps the own tone of a book when no neighbour holds it', () => {
    const [a] = idsWithTone(1, 1);
    const [b] = idsWithTone(2, 1);
    expect(assignCoverTones([a, b], 3)).toEqual([1, 2]);
  });

  it('moves a book off the tone of its left neighbour', () => {
    const [a, b] = idsWithTone(4, 2);
    expect(assignCoverTones([a, b], 3)).toEqual([4, 5]);
  });

  it('moves a book off the tone of the book above it', () => {
    const [a, d] = idsWithTone(7, 2);
    const [b, c] = idsWithTone(1, 2);
    const tones = assignCoverTones([a, b, c, d], 3);
    expect(tones[3]).not.toBe(tones[0]);
  });

  it('wraps past the last tone', () => {
    const [a, b] = idsWithTone(COVER_TONES, 2);
    expect(assignCoverTones([a, b], 3)).toEqual([COVER_TONES, 1]);
  });

  it('never gives two neighbours the same cloth', () => {
    const ids = Array.from({ length: 120 }, (_, index) => `book-${index}`);
    const tones = assignCoverTones(ids, 3);
    tones.forEach((tone, index) => {
      if (index % 3 > 0) {
        expect(tone).not.toBe(tones[index - 1]);
      }
      if (index >= 3) {
        expect(tone).not.toBe(tones[index - 3]);
      }
    });
  });

  it('lets a book without cloth neither take nor block a tone', () => {
    const [a, c] = idsWithTone(3, 2);
    expect(assignCoverTones([a, null, c], 3)).toEqual([3, null, 3]);
  });
});
