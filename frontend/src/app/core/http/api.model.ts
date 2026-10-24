import { FONT_TIERS } from './api.constants';
/**
 * Kind of a block of the internal book format.
 */
export type BlockKind = 'heading' | 'paragraph';

/**
 * One block: a single plain-text node, `\n` marking forced line breaks.
 */
export interface Block {
  /**
   * Headings start chapters and are styled apart (spec section 7.3).
   */
  readonly kind: BlockKind;

  /**
   * Plain text without markup, rendered through `textContent`.
   */
  readonly text: string;
}

/**
 * Entry of `GET /api/books`, active books only.
 */
export interface BookSummary {
  /**
   * Book identifier (UUID), used in `/lire/:id` and the `localStorage` keys.
   */
  readonly id: string;

  /**
   * Title shown in "Mes livres".
   */
  readonly title: string;

  /**
   * Author shown under the title.
   */
  readonly author: string;

  /**
   * ISO-8601 instant of the last activation, which orders never opened books in "Mes livres".
   */
  readonly activatedAt: string;

  /**
   * ISO-8601 instant the caregiver marked the book as read, `null` otherwise.
   */
  readonly finishedAt: string | null;
}

/**
 * Response of `GET /api/books/{id}`.
 */
export interface BookContent {
  /**
   * Book identifier (UUID).
   */
  readonly id: string;

  /**
   * Title, shown on the reading screen.
   */
  readonly title: string;

  /**
   * Author, shown on the reading screen.
   */
  readonly author: string;

  /**
   * Whole text in reading order; a position is an index into this list (spec section 5.3).
   */
  readonly blocks: readonly Block[];

  /**
   * ISO-8601 instant the caregiver marked the book as read, `null` otherwise.
   */
  readonly finishedAt: string | null;
}

/**
 * Font tier in pixels, applied as `data-tier` on `<html>`.
 */
export type FontTier = (typeof FONT_TIERS)[number];

/**
 * Response of `GET /api/settings`.
 */
export interface ReaderSettings {
  /**
   * Font size chosen by the caregiver, polled by the reader (spec section 5.5).
   */
  readonly fontTier: FontTier;
}
