# Design system de la liseuse

Version 4.0, 24 octobre 2026. Complète `docs/specification.md`. Source de vérité des valeurs :
`docs/design-system/tokens.css`, à copier tel quel dans `frontend/src/styles/tokens.css`. Aperçu en
taille réelle : `docs/design-system/preview.html` (ancres `#reading`, `#list`, `#status`, `#admin`).

## 1. Deux produits, un système

| | Liseuse | Backoffice |
|---|---|---|
| Public | lectrice malvoyante sur 24 pouces ; visiteurs sur tout écran | l'aidant, souvent sur téléphone |
| Attributs sur `<html>` | `data-tier` (48, 72, 100 ou 140) | `data-density="admin"` |
| Échelle | géante, proportionnelle à la largeur d'écran | conventionnelle, mobile first |
| Contraste | 7:1 (AAA) | 4,5:1 (AA) |
| Forme | aucun filet hors le pli de la double page, arrondi de 12 px, aucune ombre, aucun mouvement | arrondis 8 et 14 px, une ombre de repos et une de menu, transitions 120 ms |
| Police | Luciole 400 (texte lu, habillage) et 700 (titres de chapitre et de livre) | Atkinson Hyperlegible Next 400 et 700 ; Luciole 700 pour les titres de vue et de livre |
| Schéma de couleurs | fixe (encre brune sur papier crème) | système (`prefers-color-scheme`) |

Commun : palette (neutres chauds, rose pour le seul repère "en cours", dix lins pastel pour les livres), tokens en trois couches,
aucune bibliothèque de composants.

## 2. Principes de la liseuse

1. Une seule manière d'interagir : deux barres, un bouton, une liste de boutons.
2. Le contraste avant la taille : 7:1 pour tout texte, 3:1 pour tout contour interactif, sauf les
   commandes ton sur ton, que leur libellé désigne (décision du 24 octobre 2026).
3. Une page de livre, pas une affiche : texte en graisse normale, une quarantaine de caractères par
   ligne, deux pages côte à côte sur grand écran.
4. Rien ne bouge, rien ne décore : ni transition, ni ombre, ni icône seule, ni image. Un aplat dessine
   chaque cible, un arrondi unique les adoucit.
5. La périphérie sert à trouver, le centre sert à lire.
6. Une seule taille de référence, rendue à l'échelle de l'écran.

## 3. Tokens

Trois couches dans `tokens.css` : primitives (valeurs brutes, jamais utilisées par un composant),
sémantiques (rôle : `--color-bg`, `--color-fg`, `--color-control-bg`, etc.), composant (`--nav-bar-bg`,
`--row-current-bg`, etc.). Le backoffice a sa couche `--admin-*` avec variante sombre. Aucune valeur
en dur dans un composant.

Décisions de couleur :

- un seul thème, encre brun très foncé (`#2b251d`) sur papier crème (`#efe6d3`), 12,2:1 : le noir
  pur sur blanc cassé éblouissait davantage ;
- commandes ton sur ton : aplat crème à peine plus foncé que la page (`#d6cdbb`, l'encre mêlée à
  13 %) à libellé encre (9,6:1) ; survol un ton plus foncé (`#c8bfaf`, 8,3:1) ; pressé en aplat encre
  à libellé crème (12,2:1). L'aplat ne se détache de la page que de 1,3:1 : c'est voulu, pour que les
  commandes n'attirent plus l'œil hors du texte, et le libellé suffit à les trouver ;
- chaque livre est relié dans un des dix lins pastel répartis sur le cercle des teintes (sauge
  `#bfd3b4`, brume `#b9cfe3`, argile `#ecbfa8`, prune `#dcbfdf`, sable `#e6cf9f`, sarcelle `#b3dcd5`,
  ocre `#f0c98a`, olive `#d4d79f`, lavande `#cfc5e8`, ardoise `#c6ccd8`), texte encre, de 9,1 à
  10,2:1. Ils remplacent depuis le 24 octobre 2026 dix toiles sombres jugées trop violentes ; comme
  les commandes, ils ne se détachent de la page que de 1,2 à 1,35:1, et c'est leur teinte qui les
  désigne.
  Les couleurs ne portent aucun sens : la DMLA garde la couleur en vision périphérique, un livre se
  retrouve à sa couleur. Chacun garde la teinte tirée de son identifiant (`coverTone`), sauf si son
  voisin de gauche ou celui du dessus la porte déjà : il prend alors la suivante libre
  (`assignCoverTones`), si bien que deux voisins n'ont jamais le même lin ;
  au survol le lin fonce de 10 % vers l'encre, le texte restant à 7,6:1 ou plus ;
- le rose `#ffa6c1` ne sert qu'au livre en cours, avec texte encre (10,1:1) : teinte la plus
  saturée parmi les lins, il se repère sans la lire ; un livre terminé perd son lin et passe en
  crème pâle à texte encre (10,2:1) ;
- les étiquettes "En cours" et "Terminé" sont des pastilles encre à texte crème, posées seulement sur
  ces deux blocs clairs.

Contrastes mesurés, liseuse (cible 7:1) :

| Paire | Contraste |
|---|---|
| texte sur fond | 12,2 |
| texte atténué sur fond (titre courant, numéros) | 8,3 |
| libellé sur commande / survolée / pressée | 9,6 / 8,3 / 12,2 |
| texte encre sur lin (dix lins) | de 9,1 (prune) à 10,2 (sarcelle) ; 7,6 à 8,6 au survol |
| lin sur fond (dérogation, voir section 2) | 1,2 à 1,35 |
| commande sur fond (dérogation, voir section 2) | 1,3 |
| titre sur bloc en cours, au repos / survolé | 10,1 / 8,3 |
| titre sur bloc terminé, au repos / survolé | 13,5 / 10,8 |

Backoffice (cible 4,5:1) : texte sur fond 16,1 clair et 17,0 sombre ; texte d'accent sur accent 5,6 et
10,5 ; états succès, avertissement, danger sur fond au moins 5,2. À recalculer si une primitive change.

## 4. Typographie

- **Luciole** 400 et 700, auto-hébergée dans `../public` (CC BY 4.0, attribution dans le README
  et l'application). Pas d'italique : le format interne n'en a pas.
- **Atkinson Hyperlegible Next** 400 et 700, auto-hébergée, pour le backoffice et en repli de la
  liseuse. Repli final Arial, `system-ui`.
- Liseuse : texte lu en 400, comme les commandes, auteurs, étiquettes, titre courant et numéros ;
  titres de chapitre et de livre en 700. Espacement 0,01 em, interligne 1,55 (titres 1,2).
  Paragraphes sans blanc entre eux, ouverts par un alinéa de 1,5 em, sauf en tête de chapitre,
  après un titre ou la page de titre. Titres de chapitre centrés, 1,5 x corps, 0,4 em au-dessus et
  1 em en dessous. Backoffice : interligne
  1,5, échelle fixe 13, 14, 16, 18, 22, 28 px.

**Paliers** : un palier est la taille en pixels sur tout écran d'au moins 1280 px CSS, ce qui absorbe
la mise à l'échelle Windows (1536 px CSS à 125 %). En dessous, proportionnel avec plancher 20 px :

```
--text-body = clamp(20px, palier / 12.8 * 1vw, palier * 1px)
```

| Palier | 1280 px et plus | 1024 px | 768 px | 400 px |
|---|---|---|---|---|
| 28 | 28 | 22 | 20 | 20 |
| 32 | 32 | 26 | 20 | 20 |
| 36 | 36 | 29 | 22 | 20 |
| 40 | 40 | 32 | 24 | 20 |

Dérivés : titre 1,5 x corps ; commandes 0,85 x corps entre 20 et 72 px ; métadonnées 0,6 x corps
entre 16 et 64 px ; titre courant et numéros 0,6 x corps entre 16 et 32 px. Au palier 32 sur
1920 x 1080, en double page : une cinquantaine de caractères par ligne.

## 5. Mise en page

Liseuse, à toute largeur : aucun en-tête, seulement une ligne de tête, sans fond ni filet, calée sur
la largeur du contenu qu'elle surmonte. Sur "Mes livres", elle porte le titre de l'écran à gauche et
l'indicateur à droite ; en lecture, le titre courant (titre du livre à gauche, auteur à droite), et
les numéros de page passent sous le texte. Le contenu prend tout le reste, et le pied ne porte que
des commandes. En lecture, à partir de 1 100 px CSS en paysage, deux pages côte à côte séparées par
une gouttière `clamp(48px, 5vw, 120px)` au milieu de laquelle court le pli, un trait crème de 2 px
(`--fold-color`), seul filet de la liseuse ; une page seule en dessous.
En lecture, "Mes livres" en tête à gauche, et au pied "Précédent" et "Suivant" en deux moitiés calées
sur les pages, l'écart sur le pli ; sur "Mes livres", les mêmes deux moitiés, une barre seule gardant la sienne. Texte centré sur 1 880 px maximum,
grille de livres sur 1 500 px.

Marges de lecture `clamp(16px, 4vw, 80px)` (environ 100 px de chaque côté sur 1920 px), marges de la grille `clamp(8px, 1vw, 20px)` : les blocs
sont le contenu de cet écran, donc ils prennent la place que les marges laissent. Curseur agrandi seulement dans la liseuse, sur
`pointer: fine` à partir de 1100 px, taille constante sur toute la page pour ne pas
perdre le pointeur : flèche sur la page et son texte, main sur tout ce qui se
presse, blocs comme barres, même noir cerné de blanc et même 48 px, `pointer` en repli. Jamais dans le backoffice, qui s'adresse à une personne
voyante : la règle est gardée par `:root:not([data-density='admin'])`. Espacement base 8 px. Aucun filet : commandes et blocs sont
des aplats arrondis à 12 px (`--radius-reader`) ; les barres du pied sont séparées par 8 px de papier
et le pied garde 8 px au-dessus, `--grid-padding` sur les côtés et en bas. Les blocs de la grille sont
séparés par la gouttière de 24 px. Sous 480 px, retrait des blocs réduit à 8 px (16 px en bas), sans
quoi un tiers d'écran de téléphone coupait les titres en plein mot.

Backoffice : aucune contrainte de basse vision ne s'y applique, ni curseur agrandi, ni paliers, ni
contraste 7:1. Chaque composant de la liseuse porte ses classes BEM dans sa propre feuille
(`book-card`, `book-card__title`, `library__grid`) ; celles du backoffice portent `a-` et vivent dans les
partiels Sass du shell, chaque vue ajoutant sa feuille. Tailwind ne sert qu'à la mise en page, sans
preflight ni thème par défaut. Les espacements du backoffice sont des multiples de `--admin-spacing`
(4 px au corps par défaut), l'unité de Tailwind : `gap-3` vaut trois fois `--admin-spacing`. Sous 900 px, en-tête de 64 px, une colonne, gouttière 16 px, barre d'onglets fixe en bas
(Catalogue, Bibliothèque, Dépôt, Réglages) au-dessus de la zone de sécurité ; à partir de 900 px,
rail de 240 px à gauche, contenu limité à 960 px. Rayons 6 et 10 px, contrôles de 44 px, une ombre en
clair, aucune en sombre.

## 6. Focus et clavier

Liseuse : sur `:focus-visible`, double anneau intérieur qui suit l'arrondi, 6 px encre sur le bord puis
6 px crème en dedans (`--focus-shadow`) : l'encre se voit sur les blocs clairs, le crème sur les aplats
sombres. Backoffice : anneau de 3 px avec espace de 2 px. Touches et
anti-rebond : cahier des charges 5.1. Aucun geste tactile requis.

## 7. Composants de la liseuse

| Composant | Spécification |
|---|---|
| Pied | pied de l'écran, commandes seules. En lecture (`reader__commands`) : une grille de deux moitiés aux marges du texte, écart `--spread-gap` en double page (sur le pli) et 8 px sinon, "Précédent" toujours à gauche et "Suivant" toujours à droite, chacune de la largeur de sa page, une moitié restant vide quand sa barre n'est pas rendue. Sur "Mes livres" (`library__commands`) : la même grille de deux moitiés, aux marges de la grille de livres et séparées par sa gouttière de 24 px. Une barre qui ne mène nulle part n'est pas rendue, et sur "Mes livres" le pied disparaît entièrement quand tout tient sur une page. Sous 480 px, les barres perdent leur chevron et leur marge interne pour garder les trois libellés sur une rangée ; l'écran ne dépasse jamais la fenêtre |
| Ligne de tête `page-head` | première rangée de l'écran ; rangée alignée à droite, centrée sur `--reading-max-width` ou, avec `page-head--wide`, sur `--grid-max-width`. Le titre s'y pousse à gauche tout seul, donc l'indicateur reste à droite quand il n'y a pas de titre |
| Titre `page-head__title` | `--page-title-size` (entre 20 et 35 px, calé sur le palier 100 sans en dépendre : c'est du décor, pas du texte de lecture). Sur "Mes livres" seulement |
| Indicateur `page-head__indicator` | `--indicator-size` (0,6 x corps, entre 16 et 32 px), texte atténué, chiffres tabulaires, `aria-live="polite"`, aucun filet. Porte "Titres 1 à 6 sur 7" sur la liste. Volontairement discret : c'est un état, jamais une commande |
| Titre courant `reader__head` | en lecture, à la place de `page-head` : titre du livre (le `h1` de l'écran) en encre et en 700, puis l'auteur en texte atténué et en 400, 32 px plus loin, tous deux à droite, séparé du texte par `--reader-head-gap` (48 px) pour ne jamais se lire comme sa première ligne, en `--indicator-size` atténué et en 400, chacun sur une ligne, coupé par des points de suspension plutôt que replié |
| Numéros `reader__folios` | sous le texte, une grille aux colonnes et à la gouttière des pages : un numéro centré sous chaque page, le total sous la dernière ("15", "16 sur 840" ; "17 sur 840" seul quand la page de droite est blanche). Même taille et même teinte que le titre courant, chiffres tabulaires, cachés au lecteur d'écran, qui reçoit "Pages 15 et 16 sur 840" par une phrase `aria-live` |
| Barre `nav-bar` | hauteur minimale `1,4 x --button-min-height` ; chevron SVG (1,2 x `--text-control`, trait 12) puis libellé en `--nav-bar-label-size` sur une ligne, en 400 ; chevron à trait 10 et bouts arrondis. Aplat ton sur ton sans filet, arrondi 12 px, libellé encre ; survol un ton plus foncé, pressé en aplat encre à libellé crème. Aucun état désactivé : sur la première ou la dernière page, la barre inutile est retirée du DOM et celle qui reste occupe la place libérée |
| Sortie `nav-bar--exit` | "Mes livres" en lecture, en tête à gauche : une `nav-bar` sans aplat au repos, flèche de retour (hampe et pointe, distincte du chevron de "Précédent") puis libellé encre, haute de `--button-min-height`, tirée à gauche de sa marge interne pour que la flèche s'aligne sur le texte ; l'aplat ton sur ton n'apparaît qu'au survol, pressé en encre comme les barres |
| Bouton `status-screen__retry` | "Réessayer" : hauteur `max(56px, 2 x --text-control)`, même aplat ton sur ton, arrondi, graisse et états que la barre |
| Surface `reading` | 1 880 px max centrée, `overflow: hidden`, `column-count` à `--pages-per-view` (1, ou 2 à partir de 1 100 px CSS en paysage), gouttière `--spread-gap` en double page et pli de 2 px en son milieu, marges latérales par `padding` ; corps `--text-body` en 400, aligné à gauche, `white-space: pre-line`, `hyphens: auto`, `overflow-wrap: anywhere`, `user-select: none` ; paragraphes sans blanc, alinéa `--indent-paragraph` sauf en tête de chapitre, après un titre ou la page de titre ; titres `--text-heading` en 700, centrés, `--heading-space-before` en `padding` (gardé en haut de colonne) et `--heading-space-after` en marge, `text-wrap: balance`, `break-after: avoid` ; auteur et "Fin du livre" en `--text-meta` atténué et centrés |
| Grille `library__grid` | trois colonnes égales, trois rangées par page au plus, gouttière 24 px, 1 500 px de large au maximum, calée en haut. La ligne de tête partage ses marges latérales, sans quoi le titre cesse de surmonter le premier bloc. `grid-auto-rows: 1fr` : sur une grille de hauteur indéfinie, toutes les rangées prennent la hauteur de la plus grande, donc tous les blocs font la même taille quelle que soit la longueur de leur titre. Paginée par rangées entières : une rangée n'est jamais coupée, et une rangée plus haute que l'écran occupe sa propre page. Les blocs des autres pages gardent leur boîte, pour que la mesure reste valable, mais passent en `visibility: hidden` |
| Bloc `book-card` | le livre entier tient dans un aplat de lin (`data-tone` de 1 à 10, attribué par `assignCoverTones`, absent sur les blocs en cours et terminés) : titre en `--card-title-size` et en 700, auteur en `--card-author-size` et en 400 puis, s'il y a lieu, l'étiquette d'état, groupés en haut à gauche ; dans le coin supérieur droit, une icône Lucide de l'état (`--card-icon-size`, 1,3 x le titre, décorative) : livre fermé, livre ouvert pour le livre en cours, coche pour un livre terminé, masquée sur téléphone faute de place. Ni couverture ni filet. Texte encre sur le lin, retrait interne de 24 px, arrondi 12 px, hauteur minimale `2 x --button-min-height`, alignés à gauche. Conteneur de requête (`container-type: inline-size`), donc son texte se mesure sur la colonne et jamais sur la fenêtre ; le titre est plafonné à `8cqi` pour qu'une colonne large ne coûte pas une rangée de la grille, l'auteur à `6cqi` pour que les deux lignes ne se retrouvent jamais à la même taille sur une colonne étroite. En cours : bloc rose à texte encre, seul bloc clair et coloré. Terminé : bloc crème pâle à texte encre, sans lin. Survol : le lin fonce de 10 % vers l'encre (`color-mix`), rose 400 pour le bloc en cours, beige soutenu pour le bloc terminé ; rien ne bouge. Pressé : beige soutenu à texte encre, comme les commandes |
| Étiquette `book-card__tag` | `--card-meta-size`, pastille encre à texte crème, arrondi 6 px, jamais en capitales ; n'apparaît que sur les blocs clairs (en cours, terminé). "En cours" et "Terminé" : la couleur seule ne suffit jamais à porter l'état |
| Aperçu `a-preview` (backoffice) | rendu réel du palier, réduit à la boîte : la boîte est un conteneur et le texte est dimensionné en `cqi`, sinon il se mesure sur la fenêtre entière et déborde |
| Écran d'état `status-screen` | une phrase centrée en `--text-body`, 24 caractères par ligne maximum, un bouton |
| Étagère vide `library__empty` | à la place de la grille sur "Mes livres" quand la liste reçue est vide : même phrase centrée que `status-screen`, sans bouton ; la ligne de tête et l'engrenage restent |

## 8. Composants du backoffice

Un établi pour l'aidant : fond ardoise froid (`#eff0f2`), rail de navigation en toile marine
(`#223a63`, la toile sombre que portaient les livres jusqu'au 24 octobre 2026), commandes en bleu tampon (`#2e45b8`, l'encre des
tampons de bibliothèque). Le rose `#ffa6c1` garde son seul sens, "vous êtes ici" : il marque la
section courante comme il marque le livre en cours. Les titres de vue et de livre sont en Luciole
700, pour qu'une ligne de la Bibliothèque se lise comme l'étagère de la lectrice. Variante sombre
(`prefers-color-scheme`) : fond `#0f1218`, accent `#9fb0ff`. Tout couple texte et fond est à 4,5:1
ou plus, tout contour d'interaction à 3:1.

| Composant | Spécification |
|---|---|
| Coque | mobile : barre haute marine (marque, "Se déconnecter") et barre d'onglets fixée en bas ; dès 900 px : rail marine de 248 px (marque en haut, sections, "Se déconnecter" en bas) |
| Marque `a-brand` | trois dos de livres (crème, rose, beige) sur une pastille, "Liseuse" en Luciole et "administration" |
| Navigation `a-nav` | icône plus libellé, section courante en blanc gras sur marine clair, filet rose de 3 px (en haut sur mobile, à gauche sur le rail), `aria-current="page"` |
| En-tête de vue `a-view-head` | titre Luciole 30 px, une ligne d'appoint atténuée |
| Champ `a-input` | 44 px, bordure forte 1 px, rayon 8 px, libellé 14 px gras au-dessus ou masqué (`sr-only`) quand une loupe et un texte indicatif suffisent (`a-filter`) |
| Bouton `a-btn` | 44 px, rayon 8 px, jamais de contour ; `primary` aplat accent ; `secondary` aplat gris doux (`--admin-control-bg`), un ton plus sombre au survol ; `danger` aplat rouge pâle à texte danger, plein au survol et dans la confirmation ; `sm` texte 14 px ; icône Lucide de 18 px (16 px en `sm`) avant le libellé, `aria-hidden`, jamais seule |
| Carte `a-card` | surface, bordure, rayon 14 px, ombre ; résultat du catalogue (`a-result`) : titre, auteur, résumé sur deux lignes, action à droite |
| Liste `a-list` | une seule feuille, lignes séparées d'un filet ; titre Luciole, métadonnées atténuées, pastilles d'état, toutes les actions visibles à droite (Retirer ou Réactiver, Modifier, Marquer comme lu, Supprimer) ; livre retiré au titre atténué |
| Pastille `a-chip` | pilule à point coloré : succès (active), neutre (retiré), accent (lu) |
| Contrôle segmenté `a-seg` | rail atténué, choix en surface blanche ombrée, `aria-pressed` ; filtre d'état avec effectif (`a-count`) |
| Aperçu `a-preview` | l'écran de la lectrice : cadre sombre, papier 16:9, une phrase dans le palier choisi à l'échelle, légende avec la taille réelle |
| Zone de dépôt `a-drop` | pointillés forts, icône, bouton secondaire ; en accent pâle quand un fichier la survole |
| Vide `a-empty` | cadre pointillé, phrase qui dit quoi faire |
| Message `a-message` | bandeau pâle succès ou danger, texte gras |
| Connexion | fond marine, carte centrée : marque, titre, champ mot de passe, bouton "Entrer" ; lien "Retour aux livres" en haut à gauche ; erreur sous le bouton |
| Chargement `a-loading` | `role="status"`, les trois dos de la marque (`a-brand__mark`) qui se lèvent l'un après l'autre (`--admin-loading-duration`) et une phrase atténuée qui nomme ce qui charge ; immobiles sous `prefers-reduced-motion`, la phrase suffit |
| Attente | bouton en "en cours" (`aria-busy`, désactivé), son icône remplacée par un cercle Lucide qui tourne (`a-spin`, `--admin-spin-duration`), puis succès ou échec en clair |

## 9. Interdits

Liseuse : valeur en dur, `transition`, `animation`, capitales, icône sans libellé, filet ou bordure (hors le pli de la double page),
autre arrondi que `--radius-reader` et `--radius-tag`, `box-shadow` hors anneau de focus, contenu au survol, geste obligatoire, tout élément autre que le
texte dans la surface de lecture. Backoffice : valeur en dur, couleur d'état comme accent, cible sous
44 px, contenu utile au survol.
