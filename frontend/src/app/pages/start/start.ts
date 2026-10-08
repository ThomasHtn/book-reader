import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { resumableBookId } from '@core/reader/reading-progress';
import { StatusScreen } from '@shared/status-screen/status-screen';

/**
 * Route `/`: resumes the last book or opens "Mes livres", without any welcome screen.
 */
@Component({
  selector: 'app-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusScreen],
  templateUrl: './start.html',
})
export class Start {
  /**
   * Book list whose first answer decides the redirect; also says when the server is unreachable.
   */
  protected readonly data = inject(ReaderData);

  /**
   * Last opened book and its progress.
   */
  private readonly store = inject(ProgressStore);

  /**
   * Performs the redirect.
   */
  private readonly router = inject(Router);

  /**
   * Set by the first redirect, so later polls never navigate again.
   */
  private redirected = false;

  /**
   * Redirects once the list is known: the last book if it can be resumed, "Mes livres" otherwise (spec 4).
   */
  constructor() {
    effect(() => {
      const books = this.data.books();
      if (books === undefined || this.redirected) {
        return;
      }
      this.redirected = true;
      const bookId = resumableBookId(this.store.lastBookId(), books, (id) =>
        this.store.progressOf(id),
      );
      // `replaceUrl` keeps `/` out of the history, so going back never lands on this empty page.
      void this.router.navigateByUrl(bookId ? `/lire/${bookId}` : '/livres', { replaceUrl: true });
    });
  }
}
