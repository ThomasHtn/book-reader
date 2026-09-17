import { lowerBound } from './lower-bound';

describe('lowerBound', () => {
  const values = [0, 10, 20, 30, 40];

  it('returns the first index satisfying a monotonic predicate', () => {
    expect(lowerBound(0, values.length, (i) => values[i] >= 25)).toBe(3);
    expect(lowerBound(0, values.length, (i) => values[i] >= 0)).toBe(0);
  });

  it('returns the upper bound when no index satisfies it', () => {
    expect(lowerBound(0, values.length, (i) => values[i] > 40)).toBe(5);
  });

  it('probes a logarithmic number of indexes', () => {
    let probes = 0;
    lowerBound(0, 1_000_000, (i) => {
      probes++;
      return i >= 765_432;
    });
    expect(probes).toBeLessThanOrEqual(21);
  });
});
