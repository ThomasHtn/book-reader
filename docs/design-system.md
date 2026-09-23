# Design system de la liseuse

Version 3.2, 23 septembre 2026. Complète `docs/specification.md`. Source de vérité des valeurs :
`docs/design-system/tokens.css`, à copier tel quel dans `frontend/src/styles/tokens.css`. Aperçu en
taille réelle : `docs/design-system/preview.html` (ancres `#reading`, `#list`, `#status`, `#admin`).

## 1. Deux produits, un système

| | Liseuse | Backoffice |
|---|---|---|
| Public | lectrice malvoyante sur 24 pouces ; visiteurs sur tout écran | l'aidant, souvent sur téléphone |
| Attributs sur `<html>` | `data-tier` (48, 72, 100 ou 140) | `data-density="admin"` |
| Échelle | géante, proportionnelle à la largeur d'écran | conventionnelle, mobile first |
| Contraste | 7:1 (AAA) | 4,5:1 (AA) |
| Forme | aucun filet, arrondi de 12 px, aucune ombre, aucun mouvement | arrondis 8 et 14 px, une ombre de repos et une de menu, transitions 120 ms |
| Police | Luciole 700 (texte lu, titres de livres) et 400 (habillage) | Atkinson Hyperlegible Next 400 et 700 ; Luciole 700 pour les titres de vue et de livre |
| Schéma de couleurs | fixe (noir sur blanc, surfaces beige) | système (`prefers-color-scheme`) |

Commun : palette (neutres chauds, rose pour le seul repère "en cours", dix toiles sombres pour les livres), tokens en trois couches,
aucune bibliothèque de composants.

## 2. Principes de la liseuse

1. Une seule manière d'interagir : deux barres, un bouton, une liste de boutons.
2. Le contraste avant la taille : 7:1 pour tout texte, 3:1 pour tout contour interactif.
3. Rien ne bouge, rien ne décore : ni transition, ni filet, ni ombre, ni icône seule, ni image. Un
   aplat sombre dessine chaque cible, un arrondi unique les adoucit.
4. La périphérie sert à trouver, le centre sert à lire.
5. Une seule taille de référence, rendue à l'échelle de l'écran.

## 3. Tokens

Trois couches dans `tokens.css` : primitives (valeurs brutes, jamais utilisées par un composant),
sémantiques (rôle : `--color-bg`, `--color-fg`, `--color-control-bg`, etc.), composant (`--nav-bar-bg`,
`--row-current-bg`, etc.). Le backoffice a sa couche `--admin-*` avec variante sombre. Aucune valeur
en dur dans un composant.

Décisions de couleur :

- un seul thème, noir sur blanc cassé (`#f4efe6`) ;
- aucun filet : un fond beige ne se détache du papier que de 1,2:1, donc toute cible est un aplat
  sombre qui se pose seul sur la page ;
- commandes en aplat encre (`#141414`) à libellé crème (16,1:1) ; survol un ton plus clair
  (`#333333`, 12,1:1) ; pressé en surface beige à texte encre (10,8:1) ;
- chaque livre est relié dans une des dix toiles réparties sur le cercle des teintes (bordeaux
  `#7a2233`, rouille `#803014`, terre d'ombre `#5a3a1a`, olive `#4a4a14`, vert `#1f4d3d`, sarcelle
  `#16535a`, marine `#223a63`, indigo `#3a3079`, prune `#553059`, magenta `#7a1f5c`), texte crème.
  Les couleurs ne portent aucun sens : la DMLA garde la couleur en vision périphérique, un livre se
  retrouve à sa couleur. Chacun garde la teinte tirée de son identifiant (`coverTone`), sauf si son
  voisin de gauche ou celui du dessus la porte déjà : il prend alors la suivante libre
  (`assignCoverTones`), si bien que deux voisins n'ont jamais la même toile ;
  au survol la toile fonce de 30 % vers l'encre, ce qui ne fait que monter le contraste ;
- le rose `#ffa6c1` ne sert qu'au livre en cours, avec texte encre (10,1:1) : seul bloc clair et
  coloré parmi les toiles, il se repère sans la lire ; un livre terminé perd sa toile et passe en
  beige pâle à texte encre (13,5:1) ;
- les étiquettes "En cours" et "Terminé" sont des pastilles encre à texte crème, posées seulement sur
  ces deux blocs clairs.

Contrastes mesurés, liseuse (cible 7:1) :

| Paire | Contraste |
|---|---|
| texte sur fond | 16,1 |
| texte atténué sur fond | 7,7 |
| libellé sur commande / survolée / pressée | 16,1 / 12,1 / 10,8 |
| texte crème sur toile (dix toiles) | de 7,6 (sarcelle) à 9,9 (marine) |
| toile ou commande sur fond (cible 3:1, sans filet) | 7,6 à 16,1 |
| titre sur bloc en cours, au repos / survolé | 10,1 / 8,3 |
| titre sur bloc terminé, au repos / survolé | 13,5 / 10,8 |

Backoffice (cible 4,5:1) : texte sur fond 16,1 clair et 17,0 sombre ; texte d'accent sur accent 5,6 et
10,5 ; états succès, avertissement, danger sur fond au moins 5,2. À recalculer si une primitive change.

## 4. Typographie

- **Luciole** 400 et 700, auto-hébergée dans `../public` (CC BY 4.0, attribution dans le README
  et l'application). Pas d'italique : le format interne n'en a pas.
- **Atkinson Hyperlegible Next** 400 et 700, auto-hébergée, pour le backoffice et en repli de la
  liseuse. Repli final Arial, `system-ui`.
- Liseuse : texte lu et titres de livres en 700 ; commandes, auteurs, étiquettes, titre de l'écran
  et indicateur en 400. Espacement 0,01 em, interligne 1,4 (titres 1,15). Backoffice : interligne
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
voyante : la règle est gardée par `:root:not([data-density='admin'])`. Espacement base 8 px. Aucun filet : commandes et blocs sont
des aplats arrondis à 12 px (`--radius-reader`) ; les barres du pied sont séparées par 8 px de papier
et le pied garde 8 px au-dessus, `--grid-padding` sur les côtés et en bas. Les blocs de la grille sont
séparés par la gouttière de 24 px. Sous 480 px, retrait des blocs réduit à 8 px (16 px en bas), sans
quoi un tiers d'écran de téléphone coupait les titres en plein mot.

Backoffice : aucune contrainte de basse vision ne s'y applique, ni curseur agrandi, ni paliers, ni
contraste 7:1. Les classes de la liseuse sont toutes préfixées (`book-grid`, `book-card`,
`book-cover`) : un nom nu comme `grid` entrerait en collision avec les utilitaires Tailwind du
backoffice. Sous 900 px, en-tête de 64 px, une colonne, gouttière 16 px, barre d'onglets fixe en bas
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
| Pied `nav-footer` | pied de `screen`, commandes seules : une rangée `nav-row` en flex. Les barres se partagent la place (`flex: 1`), "Mes livres" prend celle de son libellé, ou toute la largeur s'il reste seul. Une barre qui ne mène nulle part n'est pas rendue, et sur "Mes livres" le pied disparaît entièrement quand tout tient sur une page |
| Ligne de tête `page-head` | première rangée de `screen` ; rangée alignée à droite, centrée sur `--reading-max-width` ou, avec `page-head--grid`, sur `--grid-max-width`. Le titre s'y pousse à gauche tout seul, donc l'indicateur reste à droite quand il n'y a pas de titre |
| Titre `page-title` | `--page-title-size` (entre 20 et 35 px, calé sur le palier 100 sans en dépendre : c'est du décor, pas du texte de lecture). Sur "Mes livres" seulement |
| Indicateur `page-indicator` | `--indicator-size` (un quart du corps, entre 16 et 32 px), texte atténué, chiffres tabulaires, `aria-live="polite"`, aucun filet. Porte "Page 12 sur 840" en lecture, "Titres 1 à 6 sur 7" sur la liste. Volontairement discret : c'est un état, jamais une commande |
| Barre `nav-bar` | hauteur minimale `1,4 x --button-min-height` ; chevron SVG (1,2 x `--text-control`, trait 12) puis libellé en `--nav-bar-label-size` sur une ligne, en 400 ; chevron à trait 10 et bouts arrondis. Aplat encre sans filet, arrondi 12 px, libellé crème ; survol un ton plus clair, pressé en beige à texte encre. Aucun état désactivé : sur la première ou la dernière page, la barre inutile est retirée du DOM et celle qui reste occupe la place libérée |
| Sortie `nav-bar--exit` | "Mes livres" en lecture : une `nav-bar` sans chevron, large de son libellé plus `--button-padding-x` |
| Bouton `button` | "Réessayer" : hauteur `max(56px, 2 x --text-control)`, même aplat, arrondi, graisse et états que la barre |
| Surface `reading` | 1 500 px max centrée, `overflow: hidden`, `column-gap: 0`, marges par `padding` ; corps `--text-body`, aligné à gauche, `white-space: pre-line`, `hyphens: auto`, `overflow-wrap: anywhere`, `user-select: none` ; titres `--text-heading`, `text-wrap: balance`, `break-after: avoid` ; auteur et "Fin du livre" en `--text-meta` atténué |
| Grille `book-grid` | trois colonnes égales, gouttière 24 px, 1 500 px de large au maximum, calée en haut. La ligne de tête partage ses marges latérales, sans quoi le titre cesse de surmonter le premier bloc. `grid-auto-rows: 1fr` : sur une grille de hauteur indéfinie, toutes les rangées prennent la hauteur de la plus grande, donc tous les blocs font la même taille quelle que soit la longueur de leur titre. Paginée par rangées entières : une rangée n'est jamais coupée, et une rangée plus haute que l'écran occupe sa propre page. Les blocs des autres pages gardent leur boîte, pour que la mesure reste valable, mais passent en `visibility: hidden` |
| Bloc `book-card` | le livre entier tient dans un aplat de toile (`data-tone` de 1 à 10, attribué par `assignCoverTones`, absent sur les blocs en cours et terminés) : titre en `--card-title-size` et en 700, auteur en `--card-author-size` et en 400 puis, s'il y a lieu, l'étiquette d'état, groupés en haut à gauche. Ni couverture ni filet. Texte crème sur la toile, retrait interne de 24 px, arrondi 12 px, hauteur minimale `2 x --button-min-height`, alignés à gauche. Conteneur de requête (`container-type: inline-size`), donc son texte se mesure sur la colonne et jamais sur la fenêtre ; le titre est plafonné à `8cqi` pour qu'une colonne large ne coûte pas une rangée de la grille, l'auteur à `6cqi` pour que les deux lignes ne se retrouvent jamais à la même taille sur une colonne étroite. En cours : bloc rose à texte encre, seul bloc clair et coloré. Terminé : bloc beige pâle à texte encre, sans toile. Survol : la toile fonce de 30 % vers l'encre (`color-mix`), rose 400 pour le bloc en cours, beige soutenu pour le bloc terminé ; rien ne bouge. Pressé : beige soutenu à texte encre, comme les commandes |
| Étiquette `tag` | `--card-meta-size`, pastille encre à texte crème, arrondi 6 px, jamais en capitales ; n'apparaît que sur les blocs clairs (en cours, terminé). "En cours" et "Terminé" : la couleur seule ne suffit jamais à porter l'état |
| Aperçu `a-preview` (backoffice) | rendu réel du palier, réduit à la boîte : la boîte est un conteneur et le texte est dimensionné en `cqi`, sinon il se mesure sur la fenêtre entière et déborde |
| Écran d'état `status` | une phrase centrée en `--text-body`, 24 caractères par ligne maximum, un bouton |

## 8. Composants du backoffice

Un établi pour l'aidant : fond ardoise froid (`#eff0f2`), rail de navigation en toile marine
(`#223a63`, la toile du même nom côté liseuse), commandes en bleu tampon (`#2e45b8`, l'encre des
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
| Attente | bouton en "en cours" (`aria-busy`, désactivé) puis succès ou échec en clair |

## 9. Interdits

Liseuse : valeur en dur, `transition`, `animation`, capitales, icône sans libellé, filet ou bordure,
autre arrondi que `--radius-reader` et `--radius-tag`, `box-shadow` hors anneau de focus, contenu au survol, geste obligatoire, tout élément autre que le
texte dans la surface de lecture. Backoffice : valeur en dur, couleur d'état comme accent, cible sous
44 px, contenu utile au survol.
