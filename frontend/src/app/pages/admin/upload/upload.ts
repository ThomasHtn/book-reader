import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureMessage, successMessage } from '@core/admin/admin-message';

/** Upload of an EPUB: conversion and immediate activation. */
@Component({
  selector: 'app-admin-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload.html',
})
export class Upload {
  private readonly api = inject(AdminApi);

  protected readonly file = signal<File | null>(null);

  protected readonly sending = signal(false);

  protected readonly message = signal<AdminMessage | null>(null);

  protected choose(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.file.set(files?.[0] ?? null);
    this.message.set(null);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.file.set(file);
      this.message.set(null);
    }
  }

  protected async send(): Promise<void> {
    const file = this.file();
    if (!file || this.sending()) {
      return;
    }
    this.sending.set(true);
    try {
      const book = await this.api.upload(file);
      this.message.set(successMessage(`Livre ajouté et activé : ${book.title}`));
      this.file.set(null);
    } catch (error) {
      this.message.set(failureMessage(error));
    }
    this.sending.set(false);
  }
}
