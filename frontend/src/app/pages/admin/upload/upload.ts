import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideFileUp, LucideUpload } from '@lucide/angular';
import { AdminApi } from '@core/admin/admin-api';
import { failureReason } from '@core/admin/admin-errors';
import { AdminMessage, successMessage } from '@core/admin/admin-message';

/** Upload of one or more EPUB files: conversion and immediate activation, one request per file. */
@Component({
  selector: 'app-admin-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideFileUp, LucideUpload],
  templateUrl: './upload.html',
})
export class Upload {
  private readonly api = inject(AdminApi);

  protected readonly files = signal<readonly File[]>([]);

  protected readonly dragging = signal(false);

  protected readonly sending = signal(false);

  protected readonly message = signal<AdminMessage | null>(null);

  protected choose(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.files.set(files ? Array.from(files) : []);
    this.message.set(null);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.files.set(Array.from(files));
      this.message.set(null);
    }
  }

  protected async send(): Promise<void> {
    const files = this.files();
    if (!files.length || this.sending()) {
      return;
    }
    this.sending.set(true);
    const titles: string[] = [];
    const failures: { name: string; reason: string }[] = [];
    for (const file of files) {
      try {
        const book = await this.api.upload(file);
        titles.push(book.title);
      } catch (error) {
        failures.push({ name: file.name, reason: failureReason(error) });
      }
    }
    this.message.set(uploadResultMessage(titles, failures, files.length > 1));
    if (failures.length === 0) {
      this.files.set([]);
    }
    this.sending.set(false);
  }
}

/**
 * Builds the summary line for a batch of uploads.
 *
 * @param titles - Titles of the books that were added and activated.
 * @param failures - Files that failed, with their reason.
 * @param batch - Whether more than one file was submitted, to name failed files individually.
 * @returns Success line when everything went through, failure line otherwise.
 */
function uploadResultMessage(
  titles: readonly string[],
  failures: readonly { name: string; reason: string }[],
  batch: boolean,
): AdminMessage {
  if (failures.length === 0) {
    return successMessage(
      batch
        ? `${titles.length} livres ajoutés et activés : ${titles.join(', ')}`
        : `Livre ajouté et activé : ${titles[0]}`,
    );
  }
  const failureText = batch
    ? failures.map((failure) => `${failure.name} (${failure.reason})`).join(' ; ')
    : failures[0].reason;
  const addedPrefix = titles.length
    ? `${titles.length} livre(s) ajouté(s) : ${titles.join(', ')}. `
    : '';
  return { kind: 'failure', text: `${addedPrefix}Échec : ${failureText}` };
}
