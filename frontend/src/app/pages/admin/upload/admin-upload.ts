import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { LucideFileUp, LucideLoaderCircle, LucideUpload } from '@lucide/angular';

import { AdminApi } from '@core/admin/admin-api';
import { AdminMessage, failureReason } from '@core/admin/admin-message';

import { FailedUpload, uploadResultMessage } from './admin-upload.utils';

/**
 * Upload of one or more EPUB files: conversion and immediate activation, one request per file.
 */
@Component({
  selector: 'app-admin-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideFileUp, LucideLoaderCircle, LucideUpload],
  templateUrl: './admin-upload.html',
})
export class AdminUpload {
  /**
   * Admin endpoints; each upload is converted and activated server-side.
   */
  private readonly api = inject(AdminApi);

  /**
   * Files picked or dropped, kept after a failure so they can be sent again.
   */
  protected readonly files = signal<readonly File[]>([]);

  /**
   * True while files hover the drop zone, to highlight it.
   */
  protected readonly dragging = signal(false);

  /**
   * True while the batch is being sent; blocks a second press.
   */
  protected readonly sending = signal(false);

  /**
   * One-based index of the file being converted, 0 when idle.
   */
  private readonly current = signal(0);

  /**
   * Send button label, with progress through a batch.
   */
  protected readonly sendLabel = computed(() => {
    if (!this.sending()) {
      return 'Envoyer';
    }
    const total = this.files().length;
    return total > 1 ? `Envoi ${this.current()} sur ${total}` : 'Envoi en cours';
  });

  /**
   * Summary of the last batch, cleared when new files are chosen.
   */
  protected readonly message = signal<AdminMessage | null>(null);

  /**
   * Takes the files picked in the file dialog.
   */
  protected choose(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.files.set(files ? Array.from(files) : []);
    this.message.set(null);
  }

  /**
   * Takes the dropped files; preventing the default stops the browser from opening them.
   */
  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.files.set(Array.from(files));
      this.message.set(null);
    }
  }

  /**
   * Sends files one by one, so one bad file does not sink the others, then sums up.
   */
  protected async send(): Promise<void> {
    const files = this.files();
    if (!files.length || this.sending()) {
      return;
    }
    this.sending.set(true);
    const titles: string[] = [];
    const failures: FailedUpload[] = [];
    for (const [index, file] of files.entries()) {
      this.current.set(index + 1);
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
    this.current.set(0);
  }
}
