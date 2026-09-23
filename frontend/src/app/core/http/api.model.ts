/** Kind of a block of the internal book format. */
export type BlockKind = 'heading' | 'paragraph';

/** One block: a single plain-text node, `\n` marking forced line breaks. */
export interface Block {
  readonly kind: BlockKind;
  readonly text: string;
}

/** Entry of `GET /api/books`. */
export interface BookSummary {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly activatedAt: string;
  /** Set when the caregiver marked the book as read; `null` otherwise. */
  readonly finishedAt: string | null;
}

/** Response of `GET /api/books/{id}`. */
export interface BookContent {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly blocks: readonly Block[];
  readonly finishedAt: string | null;
}

/** Font tier in pixels, applied as `data-tier` on `<html>`. */
export type FontTier = 48 | 72 | 100 | 140;

/** Response of `GET /api/settings`. */
export interface ReaderSettings {
  readonly fontTier: FontTier;
}
