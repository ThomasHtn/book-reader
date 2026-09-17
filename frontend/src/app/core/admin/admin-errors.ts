import { HttpErrorResponse } from '@angular/common/http';

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
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'serveur injoignable';
    }
    const code = (error.error as { code?: unknown } | null)?.code;
    if (typeof code === 'string' && code in REASONS) {
      return REASONS[code];
    }
  }
  return 'erreur inattendue du serveur';
}
