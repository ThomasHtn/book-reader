import { HttpErrorResponse } from '@angular/common/http';
import { failureReason } from './admin-errors';

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

  it('distinguishes an unreachable server from an unexpected error', () => {
    expect(failureReason(new HttpErrorResponse({ status: 0 }))).toBe('serveur injoignable');
    expect(failureReason(apiError(500, 'INTERNAL_ERROR'))).toBe('erreur inattendue du serveur');
    expect(failureReason(new Error('boom'))).toBe('erreur inattendue du serveur');
  });
});
