import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * One book in the grid: a cover-coloured block carrying its title, its author and, when there is
 * one, its state. No cover image: title, author and colour identify the book on their own.
 */
@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-card.html',
})
export class BookCard {
  /**
   * Title in very large type, wrapped but never truncated (spec 5.4).
   */
  public readonly title = input.required<string>();

  /**
   * Always present: conversion falls back to "Auteur inconnu" when the OPF has no creator.
   */
  public readonly author = input.required<string>();

  /**
   * The book being read, marked by a rose block so it also reads as "resume here".
   */
  public readonly current = input(false);

  /**
   * Finished book: muted block tagged "Terminé" (spec 5.4).
   */
  public readonly finished = input(false);

  /**
   * Cover colour from 1 to 10, see `assignCoverTones`; `null` for a current or finished book.
   */
  public readonly tone = input<number | null>(null);

  /**
   * Emitted on click, Space or Enter: the whole block is the target.
   */
  public readonly activate = output<void>();
}
