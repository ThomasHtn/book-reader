import { readItem, removeItem, writeItem } from './browser-storage';

/**
 * Storage refusing every call, as with privacy settings or a full quota.
 */
const BROKEN = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
} as unknown as Storage;

describe('readItem, writeItem and removeItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('read, write and remove entries', () => {
    writeItem(localStorage, 'k', 'v');
    expect(readItem(localStorage, 'k')).toBe('v');

    removeItem(localStorage, 'k');
    expect(readItem(localStorage, 'k')).toBeNull();
  });

  it('treat a missing or failing storage as empty', () => {
    expect(readItem(null, 'k')).toBeNull();
    expect(readItem(BROKEN, 'k')).toBeNull();
    expect(() => writeItem(BROKEN, 'k', 'v')).not.toThrow();
    expect(() => removeItem(BROKEN, 'k')).not.toThrow();
  });
});
