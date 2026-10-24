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
