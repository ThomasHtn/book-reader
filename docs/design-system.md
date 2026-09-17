# Design system de la liseuse

Version 2.0, 17 septembre 2026. Complète `docs/specification.md`. Source de vérité des valeurs :
`docs/design-system/tokens.css`, à copier tel quel dans `frontend/src/styles/tokens.css`. Aperçu en
taille réelle : `docs/design-system/preview.html` (ancres `#reading`, `#list`, `#status`, `#admin`).

## 1. Deux produits, un système

| | Liseuse | Backoffice |
|---|---|---|
| Public | lectrice malvoyante sur 24 pouces ; visiteurs sur tout écran | l'aidant, souvent sur téléphone |
| Attributs sur `<html>` | `data-theme`, `data-tier` (48, 72, 100 ou 140) | `data-density="admin"` |
| Échelle | géante, proportionnelle à la largeur d'écran | conventionnelle, mobile first |
| Contraste | 7:1 (AAA) | 4,5:1 (AA) |
| Forme | aucun arrondi, aucune ombre, aucun mouvement | arrondis discrets, une ombre, transitions 120 ms |
| Police | Luciole 700 | Atkinson Hyperlegible Next 400 et 700 |
| Schéma de couleurs | thème choisi dans le backoffice | système (`prefers-color-scheme`) |

Commun : palette (neutres chauds, tangerine pour les commandes), tokens en trois couches, aucune
bibliothèque de composants.

## 2. Principes de la liseuse

1. Une seule manière d'interagir : deux barres, un bouton, une liste de boutons.
2. Le contraste avant la taille : 7:1 pour tout texte, 3:1 pour tout contour interactif.
3. Rien ne bouge, rien ne décore : ni transition, ni arrondi, ni ombre, ni icône seule, ni image.
4. La périphérie sert à trouver, le centre sert à lire.
5. Une seule taille de référence, rendue à l'échelle de l'écran.

## 3. Tokens

Trois couches dans `tokens.css` : primitives (valeurs brutes, jamais utilisées par un composant),
sémantiques (rôle, redéfinies par thème : `--color-bg`, `--color-fg`, `--color-control-bg`, etc.),
composant (`--nav-bar-bg`, `--row-current-bg`, etc.). Le backoffice a sa couche `--admin-*` avec
variante sombre. Aucune valeur en dur dans un composant.

Décisions de couleur :

- une seule couleur d'accent, la tangerine `#ffa03c` avec texte encre (9,1:1), identique dans les
  trois thèmes ; survol un ton plus foncé (7,8:1) ; état pressé inversé, texte tangerine sur encre ;
- bordure encre de 6 px sur les commandes : sur fond crème la tangerine ne se détache que de 1,8:1 ;
- le repère "en cours" est un fond tangerine plein, une teinte de surface serait imperceptible ;
- thème jaune sur noir : la proximité jaune et tangerine est à vérifier au calibrage, la menthe
  `#2fe0b8` est l'accent de remplacement prévu.

Contrastes mesurés, liseuse (cible 7:1) :

| Paire | Noir sur blanc | Blanc sur noir | Jaune sur noir |
|---|---|---|---|
| texte sur fond | 16,1 | 17,0 | 15,2 |
| texte atténué sur fond | 7,7 | 10,1 | 9,9 |
| libellé sur commande / survolée / pressée | 9,1 / 7,8 / 9,1 | idem | idem |
| commande ou sa bordure sur fond (cible 3:1) | 16,1 | 9,4 | 10,4 |

Backoffice (cible 4,5:1) : texte sur fond 16,1 clair et 17,0 sombre ; texte d'accent sur accent 5,6 et
10,5 ; états succès, avertissement, danger sur fond au moins 5,2. À recalculer si une primitive change.

## 4. Typographie

- **Luciole** 400 et 700, auto-hébergée dans `../public` (CC BY 4.0, attribution dans le README
  et l'application). Pas d'italique : le format interne n'en a pas.
- **Atkinson Hyperlegible Next** 400 et 700, auto-hébergée, pour le backoffice et en repli de la
  liseuse. Repli final Arial, `system-ui`.
- Liseuse : tout en 700, espacement 0,01 em, interligne 1,4 (titres 1,15). Backoffice : interligne
  1,5, échelle fixe 13, 14, 16, 18, 22, 28 px.

**Paliers** : un palier est la taille en pixels sur tout écran d'au moins 1280 px CSS, ce qui absorbe
la mise à l'échelle Windows (1536 px CSS à 125 %). En dessous, proportionnel avec plancher 20 px :

```
--text-body = clamp(20px, palier / 12.8 * 1vw, palier * 1px)
```

| Palier | 1280 px et plus | 1024 px | 768 px | 400 px |
|---|---|---|---|---|
| 48 | 48 | 38 | 29 | 20 |
| 72 | 72 | 58 | 43 | 23 |
| 100 | 100 | 80 | 60 | 31 |
| 140 | 140 | 112 | 84 | 44 |

Dérivés : titre 1,15 x corps ; commandes 0,55 x corps entre 20 et 72 px ; métadonnées 0,5 x corps
entre 16 et 64 px. Capacité sur 1920 x 1080 (barres 300 px, marges 48 px) : 44, 29, 21 et 15
caractères par ligne pour 12, 8, 6 et 4 lignes, du palier 48 au palier 140.

## 5. Mise en page

Liseuse :

| Largeur | Disposition |
|---|---|
| 1100 px et plus | barres verticales de 300 px de chaque côté, texte centré sur 1 500 px maximum |
| moins de 1100 px | barres en bas, côte à côte, 96 px de haut, texte pleine largeur |
| moins de 480 px | barres de 80 px, marges de 16 px |

Marges de lecture `clamp(16px, 2.5vw, 48px)`. Curseur agrandi seulement sur `pointer: fine` à partir
de 1100 px. Espacement base 8 px. Bordures de 6 px (commandes) et 4 px (séparateurs, étiquettes).

Backoffice : sous 900 px, en-tête de 64 px, une colonne, gouttière 16 px, barre d'onglets fixe en bas
(Catalogue, Bibliothèque, Dépôt, Réglages) au-dessus de la zone de sécurité ; à partir de 900 px,
rail de 240 px à gauche, contenu limité à 960 px. Rayons 6 et 10 px, contrôles de 44 px, une ombre en
clair, aucune en sombre.

## 6. Focus et clavier

Liseuse : sur `:focus-visible`, double anneau intérieur, 4 px dans la couleur du fond puis 8 px dans
la couleur du texte (`--focus-shadow`). Backoffice : anneau de 3 px avec espace de 2 px. Touches et
anti-rebond : cahier des charges 5.1. Aucun geste tactile requis.

## 7. Composants de la liseuse

| Composant | Spécification |
|---|---|
| Barre `nav-bar` | collée au bord ; chevron SVG (1,6 x `--text-control`, trait 12) puis libellé horizontal en `--nav-bar-label-size` sur une ligne ; bordure encre 6 px côté texte. Défaut tangerine, survol plus foncé, pressé inversé. Désactivée (première ou dernière page) : fond de page, texte atténué, bordure encre sur les quatre côtés, `aria-disabled="true"`, place inchangée |
| Bouton `button` | "Mes livres", "Réessayer" : hauteur `max(56px, 2 x --text-control)`, mêmes couleurs et états que la barre |
| Surface `reading` | 1 500 px max centrée, `overflow: hidden`, `column-gap: 0`, marges par `padding` ; corps `--text-body`, aligné à gauche, `white-space: pre-line`, `hyphens: auto`, `overflow-wrap: anywhere`, `user-select: none` ; titres `--text-heading`, `text-wrap: balance`, `break-after: avoid` ; auteur et "Fin du livre" en `--text-meta` atténué |
| Barre d'outils `toolbar` | "Mes livres" à gauche, "Page 12 sur 840" à droite en `--text-meta`, chiffres tabulaires, `aria-live="polite"` |
| Ligne `row` | bouton pleine largeur, hauteur minimale 1,8 x `--text-body`, titre en `--text-body`, auteur dessous en `--text-meta`, séparateur 4 px, `break-inside: avoid`. En cours (première ligne, non terminée) : fond tangerine, texte encre, bande gauche encre de 24 px. Terminé : texte atténué, étiquette "Terminé". Survol sous `@media (hover: hover)` seulement |
| Étiquette `tag` | `--text-meta`, bordure 4 px `currentColor`, jamais en capitales |
| Écran d'état `status` | une phrase centrée en `--text-body`, 24 caractères par ligne maximum, un bouton |

## 8. Composants du backoffice

| Composant | Spécification |
|---|---|
| En-tête `a-header` | 64 px, pastille 32 px en accent, titre 18 px, état de connexion à droite |
| Navigation `a-nav` | icône plus libellé 13 px, onglet courant en accent gras, `aria-current="page"` |
| Champ `a-input` | 44 px, bordure forte 1 px, rayon 6 px, libellé 14 px gras au-dessus |
| Bouton `a-btn` | 44 px, rayon 6 px ; `primary` accent, `secondary` surface avec bordure forte, `danger` texte et bordure danger ; `sm` 36 px |
| Carte `a-card` | surface, bordure, rayon 10 px, ombre ; titre 18 px, métadonnées 14 px, résumé sur deux lignes, actions |
| Liste `a-list` | lignes séparées de 1 px, titre gras, métadonnées atténuées, actions à droite |
| Contrôle segmenté `a-seg` | boutons de 44 px à parts égales, sélection en accent, `aria-pressed` |
| Aperçu `a-preview` | une phrase dans le thème et le palier choisis, à l'échelle de l'écran courant, avec la taille réelle sur son écran |
| Zone de dépôt `a-drop` | pointillés forts, bouton secondaire |
| Connexion | un champ mot de passe, bouton "Entrer", erreur sous le champ |
| Attente | bouton en "en cours" (`aria-busy`, désactivé) puis succès ou échec en clair sous la carte |

## 9. Interdits

Liseuse : valeur en dur, `transition`, `animation`, capitales, icône sans libellé, `border-radius`,
`box-shadow` hors anneau de focus, contenu au survol, geste obligatoire, tout élément autre que le
texte dans la surface de lecture. Backoffice : valeur en dur, couleur d'état comme accent, cible sous
44 px, contenu utile au survol.
