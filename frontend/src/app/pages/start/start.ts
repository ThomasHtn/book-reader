import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressStore } from '@core/reader/progress-store';
import { ReaderData } from '@core/reader/reader-data';
import { resumableBookId } from '@core/reader/reading-progress';
import { StatusScreen } from '@shared/status-screen/status-screen';

/** Route `/`: resumes the last book or opens "Mes livres", without any welcome screen. */
@Component({
  selector: 'app-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusScreen],
  template: `
    @if (data.unreachable()) {
      <app-status-screen (retry)="data.retry()" />
    }
  `,
})
export class Start {
  protected readonly data = inject(ReaderData);

  private readonly store = inject(ProgressStore);

  private readonly router = inject(Router);

  private redirected = false;

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
      void this.router.navigateByUrl(bookId ? `/lire/${bookId}` : '/livres', { replaceUrl: true });
    });
  }
}
