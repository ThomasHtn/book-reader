import { failureReason } from './admin-errors';

/** Result line shown after a backoffice action. */
export interface AdminMessage {
  readonly kind: 'success' | 'failure';
  readonly text: string;
}

/**
 * Builds the failure line of an action.
 *
 * @param error - Error raised by the call.
 * @returns "Échec : <raison>".
 */
export function failureMessage(error: unknown): AdminMessage {
  return { kind: 'failure', text: `Échec : ${failureReason(error)}` };
}

/**
 * Builds the success line of an action.
 *
 * @param text - What happened.
 * @returns Success line.
 */
export function successMessage(text: string): AdminMessage {
  return { kind: 'success', text };
}
