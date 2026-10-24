import { HttpErrorResponse } from '@angular/common/http';

import { failureMessage, failureMessageFor, failureReason } from './admin-message.utils';

/**
 * Builds the error HttpClient raises for an `ApiErrorResponse` body.
 */
const apiError = (status: number, code: string) =>
  new HttpErrorResponse({ status, error: { status, code, detail: 'technical detail' } });

describe('failureReason', () => {
  it('explains why an EPUB was refused', () => {
    expect(failureReason(apiError(422, 'EPUB_ENCRYPTED'))).toBe('le fichier est chiffré (DRM)');
    expect(failureReason(apiError(422, 'EPUB_NO_TEXT'))).toBe('le livre ne contient aucun texte');
    expect(failureReason(apiError(413, 'EPUB_TOO_LARGE'))).toBe('le fichier dépasse 20 Mo');
    expect(failureReason(apiError(422, 'EPUB_INVALID'))).toBe(
      "ce n'est pas un fichier EPUB valide",
    );
  });

  it('explains catalogue failures', () => {
    expect(failureReason(apiError(503, 'CATALOGUE_UNAVAILABLE'))).toBe(
      'site du catalogue injoignable',
    );
    expect(failureReason(apiError(503, 'CATALOGUE_REFUSED'))).toBe(
      'le catalogue refuse les téléchargements pour le moment, réessayez plus tard',
    );
    expect(failureReason(apiError(404, 'RESOURCE_NOT_FOUND'))).toBe('introuvable');
  });

  it('explains the refusals nginx and the key filter answer themselves', () => {
    expect(failureReason(new HttpErrorResponse({ status: 413, error: '<html>' }))).toBe(
      'le fichier dépasse 20 Mo',
    );
    expect(failureReason(apiError(503, 'UNAVAILABLE'))).toBe('serveur injoignable');
    expect(failureReason(new HttpErrorResponse({ status: 502 }))).toBe('serveur injoignable');
    expect(failureReason(apiError(429, 'ADMIN_KEY_RATE_LIMITED'))).toBe(
      "trop d'essais, réessayez dans une minute",
    );
    expect(failureReason(apiError(400, 'INVALID_ARGUMENT'))).toBe('valeur invalide');
  });

  it('distinguishes an unreachable server from an unexpected error', () => {
    expect(failureReason(new HttpErrorResponse({ status: 0 }))).toBe('serveur injoignable');
    expect(failureReason(apiError(500, 'INTERNAL_ERROR'))).toBe('erreur inattendue du serveur');
    expect(failureReason(new Error('boom'))).toBe('erreur inattendue du serveur');
  });
});

describe('failureMessage and failureMessageFor', () => {
  it('words a failure after "Échec :", with what went through first if anything did', () => {
    expect(failureMessage(new HttpErrorResponse({ status: 0 }))).toEqual({
      kind: 'failure',
      text: 'Échec : serveur injoignable',
    });
    expect(failureMessageFor('introuvable', '1 livre ajouté. ')).toEqual({
      kind: 'failure',
      text: '1 livre ajouté. Échec : introuvable',
    });
  });
});
