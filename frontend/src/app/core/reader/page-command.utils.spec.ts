import { pageCommandOf } from './page-command.utils';

/**
 * Builds a key press, modifiers given through `init`.
 */
const key = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key, ...init });

describe('pageCommandOf', () => {
  it('turns pages with the arrows', () => {
    expect(pageCommandOf(key('ArrowRight'), false)).toBe('next');
    expect(pageCommandOf(key('ArrowLeft'), false)).toBe('previous');
  });

  it('turns to the next page with Space only where Space turns pages', () => {
    expect(pageCommandOf(key(' '), true)).toBe('next');
    expect(pageCommandOf(key(' '), false)).toBeNull();
  });

  it('leaves chords with Ctrl, Alt or Meta to the browser', () => {
    expect(pageCommandOf(key('ArrowRight', { ctrlKey: true }), true)).toBeNull();
    expect(pageCommandOf(key('ArrowLeft', { altKey: true }), true)).toBeNull();
    expect(pageCommandOf(key(' ', { metaKey: true }), true)).toBeNull();
  });

  it('ignores every other key', () => {
    expect(pageCommandOf(key('Enter'), true)).toBeNull();
    expect(pageCommandOf(key('ArrowDown'), true)).toBeNull();
  });
});
