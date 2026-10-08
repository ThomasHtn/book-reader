/**
 * Page turn asked by a footer bar or a key.
 */
export type PageCommand = 'previous' | 'next';

/**
 * Reads the page turn a key press asks for (specification 5.1 and 5.4): arrows on every screen,
 * Space only where it means "Suivant", since in the list it activates the focused block. Chords with
 * Ctrl, Alt or Meta belong to the browser (Alt+Left goes back, Ctrl+Right moves by word).
 *
 * @param event - Key press.
 * @param spaceTurnsPage - Whether Space turns the page, as in the reader.
 * @returns Command, or `null` when the key does not turn a page.
 */
export function pageCommandOf(event: KeyboardEvent, spaceTurnsPage: boolean): PageCommand | null {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }
  if (event.key === 'ArrowRight' || (spaceTurnsPage && event.key === ' ')) {
    return 'next';
  }
  return event.key === 'ArrowLeft' ? 'previous' : null;
}
