import { uploadResultMessage } from './admin-upload.utils';

describe('uploadResultMessage', () => {
  it('names the book added alone, or counts a batch', () => {
    expect(uploadResultMessage(['Le Horla'], [], false)).toEqual({
      kind: 'success',
      text: 'Livre ajouté et activé : Le Horla',
    });
    expect(uploadResultMessage(['Le Horla', 'Boule de suif'], [], true)).toEqual({
      kind: 'success',
      text: '2 livres ajoutés et activés : Le Horla, Boule de suif',
    });
  });

  it('gives the reason of a single failure', () => {
    expect(
      uploadResultMessage([], [{ name: 'a.epub', reason: 'le fichier est chiffré (DRM)' }], false),
    ).toEqual({ kind: 'failure', text: 'Échec : le fichier est chiffré (DRM)' });
  });

  it('names each failed file of a batch after the books that went through', () => {
    expect(
      uploadResultMessage(
        ['Le Horla'],
        [
          { name: 'a.epub', reason: 'le fichier est chiffré (DRM)' },
          { name: 'b.epub', reason: 'le fichier dépasse 20 Mo' },
        ],
        true,
      ),
    ).toEqual({
      kind: 'failure',
      text:
        '1 livre(s) ajouté(s) : Le Horla. ' +
        'Échec : a.epub (le fichier est chiffré (DRM)) ; b.epub (le fichier dépasse 20 Mo)',
    });
  });
});
