# Design system de la liseuse

Version 3.0, 22 septembre 2026. Complète `docs/specification.md`. Source de vérité des valeurs :
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

Commun : palette (neutres chauds, rose pour le seul repère "en cours"), tokens en trois couches,
aucune bibliothèque de composants.

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

- les commandes sont posées sur la surface haute du thème, le beige `#e3dccb` en clair, avec le
  texte du thème (13,5:1) ; survol un ton plus soutenu (10,8:1) ; état pressé entièrement inversé,
  couleur de page sur couleur de texte ;
- fond, libellé et filet d'une commande dérivent tous de la paire fond/texte du thème, donc les
  trois thèmes restent lisibles sans règle particulière ;
- bordure de 2 px sur les commandes : leur fond ne se détache du papier que de 1,2:1, c'est le filet
  qui les pose, à 16,1:1 ;
- le rose `#ffa6c1` ne sert plus qu'au repère "en cours", avec texte encre dans les trois thèmes
  (10,1:1) : c'est la seule surface colorée de la liseuse, donc elle se repère sans la lire ;
- le repère "en cours" est un bloc rose plein, une teinte de surface serait imperceptible ;
- thème jaune sur noir : le rose et l'ambre ne se confondent pas, le rose n'y désigne que les
  commandes et le bloc du livre en cours.

Contrastes mesurés, liseuse (cible 7:1) :

| Paire | Noir sur blanc | Blanc sur noir | Jaune sur noir |
|---|---|---|---|
| texte sur fond | 16,1 | 17,0 | 15,2 |
| texte atténué sur fond | 7,7 | 10,1 | 9,9 |
| libellé sur commande / survolée / pressée | 13,5 / 10,8 / 16,1 | 13,5 / 10,2 / 17,0 | 11,5 / 8,2 / 15,2 |
| titre sur bloc survolé | 10,8 | 10,2 | 8,2 |
| titre sur bloc en cours, au repos / survolé | 10,1 / 8,3 | 10,1 / 8,3 | 10,1 / 8,3 |
| bordure de commande sur fond (cible 3:1) | 16,1 | 17,0 | 15,2 |

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
entre 16 et 64 px. Capacité en caractères par ligne sur 1920 x 1080 : à recalculer au calibrage,
la largeur de lecture utile a changé avec le passage des barres latérales au pied de page (section 5).

## 5. Mise en page

Liseuse, à toute largeur : aucun en-tête, seulement une ligne de tête, sans fond ni filet, portant le
titre de l'écran à gauche et l'indicateur de page à droite, tous deux petits. Elle est calée sur la
largeur du contenu qu'elle surmonte, sans quoi le titre flotterait loin de ce qu'il nomme. L'écran de
lecture n'y met pas de titre : le livre se nomme lui-même sur sa page de titre. Le contenu prend tout
le reste, et le pied ne porte que des commandes.
En lecture, trois commandes, "Mes livres" à la largeur de son libellé puis "Précédent" et "Suivant"
qui se partagent le reste ; sur "Mes livres", deux moitiés égales. Texte et grille de livres centrés
sur 1 500 px maximum.

Marges de lecture `clamp(16px, 2.5vw, 48px)`, marges de la grille `clamp(8px, 1vw, 20px)` : les blocs
sont le contenu de cet écran, donc ils prennent la place que les marges laissent. Curseur agrandi seulement dans la liseuse, sur
`pointer: fine` à partir de 1100 px, taille constante sur toute la page pour ne pas
perdre le pointeur : flèche sur la page et son texte, main sur tout ce qui se
presse, blocs comme barres, même noir cerné de blanc et même 64 px, `pointer` en repli. Jamais dans le backoffice, qui s'adresse à une personne
voyante : la règle est gardée par `:root:not([data-density='admin'])`. Espacement base 8 px. Bordure de 2 px sur les quatre côtés
d'une commande ; deux barres voisines font se chevaucher leurs filets pour n'en donner qu'un. Même
bordure de 2 px sur les blocs de la grille, que la gouttière de 24 px sépare déjà.

Backoffice : aucune contrainte de basse vision ne s'y applique, ni curseur agrandi, ni paliers, ni
contraste 7:1. Les classes de la liseuse sont toutes préfixées (`book-grid`, `book-card`,
`book-cover`) : un nom nu comme `grid` entrerait en collision avec les utilitaires Tailwind du
backoffice. Sous 900 px, en-tête de 64 px, une colonne, gouttière 16 px, barre d'onglets fixe en bas
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
| Pied `nav-footer` | pied de `screen`, commandes seules : une rangée `nav-row` en flex. Les barres se partagent la place (`flex: 1`), "Mes livres" prend celle de son libellé, ou toute la largeur s'il reste seul. Une barre qui ne mène nulle part n'est pas rendue, et sur "Mes livres" le pied disparaît entièrement quand tout tient sur une page |
| Ligne de tête `page-head` | première rangée de `screen` ; rangée alignée à droite, centrée sur `--reading-max-width` ou, avec `page-head--grid`, sur `--grid-max-width`. Le titre s'y pousse à gauche tout seul, donc l'indicateur reste à droite quand il n'y a pas de titre |
| Titre `page-title` | `--page-title-size` (entre 20 et 35 px, calé sur le palier 100 sans en dépendre : c'est du décor, pas du texte de lecture). Sur "Mes livres" seulement |
| Indicateur `page-indicator` | `--indicator-size` (un quart du corps, entre 16 et 32 px), texte atténué, chiffres tabulaires, `aria-live="polite"`, aucun filet. Porte "Page 12 sur 840" en lecture, "Titres 1 à 6 sur 7" sur la liste. Volontairement discret : c'est un état, jamais une commande |
| Barre `nav-bar` | hauteur minimale `1,4 x --button-min-height` ; chevron SVG (1,2 x `--text-control`, trait 12) puis libellé en `--nav-bar-label-size` sur une ligne ; bordure encre de 2 px sur les quatre côtés, celles de deux barres voisines se chevauchant. Défaut beige, survol un ton plus soutenu, pressé inversé. Aucun état désactivé : sur la première ou la dernière page, la barre inutile est retirée du DOM et celle qui reste occupe la place libérée |
| Sortie `nav-bar--exit` | "Mes livres" en lecture : une `nav-bar` sans chevron, large de son libellé plus `--button-padding-x` |
| Bouton `button` | "Réessayer" : hauteur `max(56px, 2 x --text-control)`, mêmes couleurs et états que la barre |
| Surface `reading` | 1 500 px max centrée, `overflow: hidden`, `column-gap: 0`, marges par `padding` ; corps `--text-body`, aligné à gauche, `white-space: pre-line`, `hyphens: auto`, `overflow-wrap: anywhere`, `user-select: none` ; titres `--text-heading`, `text-wrap: balance`, `break-after: avoid` ; auteur et "Fin du livre" en `--text-meta` atténué |
| Grille `book-grid` | trois colonnes égales, gouttière 24 px, 1 500 px de large au maximum, calée en haut. La ligne de tête partage ses marges latérales, sans quoi le titre cesse de surmonter le premier bloc. `grid-auto-rows: 1fr` : sur une grille de hauteur indéfinie, toutes les rangées prennent la hauteur de la plus grande, donc tous les blocs font la même taille quelle que soit la longueur de leur titre. Paginée par rangées entières : une rangée n'est jamais coupée, et une rangée plus haute que l'écran occupe sa propre page. Les blocs des autres pages gardent leur boîte, pour que la mesure reste valable, mais passent en `visibility: hidden` |
| Bloc `book-card` | le livre entier tient dans un aplat : titre en `--card-title-size`, auteur en `--card-author-size` puis, s'il y a lieu, l'étiquette d'état, groupés en haut à gauche. Ni couverture. L'auteur garde l'encre pleine du titre et se distingue par la seule taille : l'encre atténuée tomberait sous 7:1 sur l'aplat. Fond de surface, filet encre de 2 px, retrait interne de 24 px, hauteur minimale `2 x --button-min-height`, alignés à gauche. Conteneur de requête (`container-type: inline-size`), donc son texte se mesure sur la colonne et jamais sur la fenêtre ; le titre est plafonné à `8cqi` pour qu'une colonne large ne coûte pas une rangée de la grille, l'auteur à `6cqi` pour que les deux lignes ne se retrouvent jamais à la même taille sur une colonne étroite. En cours : bloc rose, seul rose de la grille. Terminé : texte et filet atténués. Survol : fond un ton plus soutenu, rose 400 pour le bloc en cours, et un bloc terminé retrouve son texte et son filet pleins, l'ink atténué passant sous 7:1 sur ce fond ; ni filet épaissi ni déplacement, la géométrie ne bouge pas. Pressé : inversé |
| Étiquette `tag` | `--card-meta-size`, bordure 2 px `currentColor`, jamais en capitales. "En cours" et "Terminé" : la couleur seule ne suffit jamais à porter l'état |
| Aperçu `a-preview` (backoffice) | rendu réel du palier et du thème, réduit à la boîte : la boîte est un conteneur et le texte est dimensionné en `cqi`, sinon il se mesure sur la fenêtre entière et déborde |
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
