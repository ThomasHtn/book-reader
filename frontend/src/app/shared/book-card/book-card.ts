import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * One book in the grid: a filled block carrying its title, its author and, when there is one, its
 * state. No cover and no placeholder for one: title and author identify the book on their own.
 */
@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="book-card"
      [class.book-card--current]="current()"
      [class.book-card--finished]="finished()"
      (click)="activate.emit()"
    >
      <span class="title">{{ title() }}</span>
      <span class="author">{{ author() }}</span>
      @if (current()) {
        <span class="tag">En cours</span>
      }
      @if (finished()) {
        <span class="tag">Terminé</span>
      }
    </button>
  `,
})
export class BookCard {
  public readonly title = input.required<string>();

  /** Always present: conversion falls back to "Auteur inconnu" when the OPF has no creator. */
  public readonly author = input.required<string>();

  /** The book being read, marked by a rose block so it also reads as "resume here". */
  public readonly current = input(false);

  public readonly finished = input(false);

  public readonly activate = output<void>();
}
