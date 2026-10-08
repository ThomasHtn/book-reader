import { AdminMessage, failureMessageFor, successMessage } from '@core/admin/admin-message';

/**
 * A file the server refused, with the reason shown to the caregiver.
 */
export interface FailedUpload {
  /**
   * File name as chosen on the computer.
   */
  readonly name: string;
  /**
   * Reason in French, as worded by `failureReason`.
   */
  readonly reason: string;
}

/**
 * Builds the summary line for a batch of uploads.
 *
 * @param batch - Whether more than one file was submitted, to name failed files individually.
 * @returns Success line when everything went through, failure line otherwise.
 */
export function uploadResultMessage(
  titles: readonly string[],
  failures: readonly FailedUpload[],
  batch: boolean,
): AdminMessage {
  if (failures.length === 0) {
    return successMessage(
      batch
        ? `${titles.length} livres ajoutés et activés : ${titles.join(', ')}`
        : `Livre ajouté et activé : ${titles[0]}`,
    );
  }
  const reasons = batch
    ? failures.map((failure) => `${failure.name} (${failure.reason})`).join(' ; ')
    : failures[0].reason;
  const added = titles.length ? `${titles.length} livre(s) ajouté(s) : ${titles.join(', ')}. ` : '';
  return failureMessageFor(reasons, added);
}
