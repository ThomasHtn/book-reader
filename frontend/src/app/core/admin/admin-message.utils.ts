import { HttpErrorResponse } from '@angular/common/http';

import { httpStatusOf } from '@core/http/http-status.utils';

import { AdminMessage } from './admin.model';

/**
 * French reason shown for each `code` of the backend `ApiErrorResponse`.
 */
const REASONS: Readonly<Record<string, string>> = {
  EPUB_ENCRYPTED: 'le fichier est chiffré (DRM)',
  EPUB_NO_TEXT: 'le livre ne contient aucun texte',
  EPUB_TOO_LARGE: 'le fichier dépasse 20 Mo',
  EPUB_INVALID: "ce n'est pas un fichier EPUB valide",
  CATALOGUE_UNAVAILABLE: 'site du catalogue injoignable',
  CATALOGUE_REFUSED: 'le catalogue refuse les téléchargements pour le moment, réessayez plus tard',
  RESOURCE_NOT_FOUND: 'introuvable',
  VALIDATION_FAILED: 'valeur invalide',
};

/**
 * Turns a failed backoffice call into the reason shown after "Échec :".
 *
 * @param error - Error raised by HttpClient.
 * @returns Reason in French.
 */
export function failureReason(error: unknown): string {
  if (httpStatusOf(error) === 0) {
    return 'serveur injoignable';
  }
  const code =
    error instanceof HttpErrorResponse
      ? (
          error.error as {
            /**
             * `ApiErrorResponse` code, absent when the body is not one.
             */
            code?: unknown;
          } | null
        )?.code
      : undefined;
  return typeof code === 'string' && code in REASONS
    ? REASONS[code]
    : 'erreur inattendue du serveur';
}

/**
 * Builds the failure line of an action.
 *
 * @param error - Error raised by the call.
 * @returns "Échec : <raison>".
 */
export function failureMessage(error: unknown): AdminMessage {
  return failureMessageFor(failureReason(error));
}

/**
 * Builds a failure line from a reason already worded, after what went through if anything did.
 *
 * @param reason - Why it failed, in French.
 * @param preamble - Sentence about what succeeded first, empty when nothing did.
 * @returns "<préambule>Échec : <raison>".
 */
export function failureMessageFor(reason: string, preamble = ''): AdminMessage {
  return { kind: 'failure', text: `${preamble}Échec : ${reason}` };
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
