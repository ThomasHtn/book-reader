# Cahier des charges : liseuse accessible

Version 2.0, 17 septembre 2026. Document de référence ; toute évolution passe par ici.

## 1. Objectif

Application web de lecture pour une seule personne : une proche âgée, DMLA débutante, qui ne lit plus
les gros caractères même à la loupe et n'utilise pas l'informatique. Elle allume l'ordinateur, elle
retrouve sa page, elle lit.

Deux faces : la **liseuse** (trois commandes) et le **backoffice** (l'aidant, Thomas, choisit les
livres et règle l'affichage à distance).

## 2. Contexte

| Élément | Valeur |
|---|---|
| Utilisatrice | DMLA débutante : vision centrale dégradée, périphérie conservée ; aucune compétence informatique, aucune saisie |
| Matériel | PC fixe Windows, écran 24 pouces (1920 x 1080 supposé), souris et clavier ; mise à l'échelle Windows inconnue |
| Navigateur | Chrome ouvert par un raccourci en mode kiosque (section 16) |
| Réseau | connexion requise en permanence |
| Public secondaire | visiteurs valides sur téléphone ou pc : la liseuse reste lisible sans réglage ; le dépôt sert de vitrine GitHub |
| Confidentialité | API de lecture publique : la liste des livres est visible de qui connaît l'adresse, non indexée ; assumé |

Conséquences de la DMLA : le contraste et la graisse comptent autant que la taille ; de grandes zones
colorées aux bords se trouvent mieux qu'un bouton au centre ; la maladie progresse, rien ne doit
empêcher une lecture à voix haute plus tard.

## 3. Périmètre

**Version 1** : reprise automatique du dernier livre, écran de lecture, écran "Mes livres" ; palier de
taille réglé depuis le backoffice ; backoffice avec recherche dans le catalogue d'Ebooks
libres et gratuits, dépôt d'EPUB, retrait et réactivation, réglages ; conversion des EPUB côté
serveur ; rendu proportionnel sur tout écran.

**Exclu** : hors ligne (abandonné pour rester simple), loupe au survol, synthèse vocale (reportée,
architecture compatible), identification du poste et comptes, suivi de progression dans le
backoffice, recherche, chapitrage et marque-pages côté lectrice, images, notes et mise en page des
livres.

## 4. Parcours de la lectrice

1. Le PC démarre, la personne clique sur l'icone sur le bureau et l'application s'ouvre en plein écran.
2. Route `/` : si un dernier livre ouvert est mémorisé, actif et non terminé, redirection vers
   `/lire/:id` à la dernière position ; sinon vers `/livres`. Aucun écran d'accueil, aucune
   confirmation.
3. En haut à gauche, "Mes livres" ; en pied, "Précédent" sous la page de gauche et "Suivant" sous
   celle de droite.
4. Bouton "Mes livres" : la liste ; un clic sur un bloc ouvre le livre à sa dernière position.
5. Fin de livre : la dernière page affiche "Fin du livre" sous le dernier paragraphe, le livre passe
   "terminé" mais reste en tête de liste tant qu'il est le dernier lu. Il n'est plus repris
   automatiquement ; le rouvrir repart de la première page mais il reste "terminé" tant qu'aucune page
   n'est tournée (un clic par erreur ne change rien) ; reculer depuis la dernière page retire
   "terminé". Un livre marqué lu dans le backoffice après sa dernière lecture se comporte comme s'il
   venait d'être terminé à la date de la marque ; une lecture postérieure à la marque (une page tournée) l'emporte.

Aucun autre parcours n'existe côté lectrice.

## 5. Liseuse

### 5.1 Écran de lecture

De haut en bas : la ligne de tête, avec le bouton "Mes livres" à gauche et le titre courant à droite,
en petit (titre du livre en gras, puis auteur en texte atténué, l'auteur omis sur téléphone), séparée du
texte par 48 px ; puis la zone de texte (une vue, sans défilement) sur tout le reste : deux pages
côte à côte comme un livre ouvert sur un écran large en paysage (1 100 px CSS et plus), une seule
page sinon ; puis les numéros de page, centrés sous chaque page, le total sous la dernière ("15",
"16 sur 840") ; puis le pied. Le lecteur d'écran reçoit "Pages 15 et 16 sur 840" (ou "Page 15 sur
840" quand une seule page est montrée). Le pied ne porte que "Précédent" et "Suivant" (flèche puis libellé), en deux
moitiés calées sur les pages : chacune sous sa page, l'écart entre elles sur le pli, ou de 8 px quand
une seule page est montrée.

Règles :

- rien d'autre dans la zone de texte que le livre : ni chapitre, ni icône ; la première page d'un
  livre affiche son titre et son auteur avant le texte ; titre courant et numéros restent hors de
  cette zone ;
- "Suivant" et "Précédent" tournent toute la vue : les deux pages à la fois ;
- clavier : flèche droite et espace pour "Suivant", flèche gauche pour "Précédent". Espace est
  intercepté au niveau du document et le focus revient à la zone de lecture après chaque page
  tournée, au clic comme au clavier, pour qu'espace signifie toujours "Suivant". Entrée garde son rôle natif : après un clic le focus n'est
  jamais sur un bouton, et au clavier seul c'est la seule façon d'activer "Mes livres" (passage
  clavier complet, section 12). Aucun autre raccourci ;
- anti-rebond : une commande reçue moins de 400 ms après la précédente est ignorée, la répétition
  automatique d'une touche maintenue est neutralisée ;
- les barres réagissent sur toute leur surface, avec un changement de couleur net, sans animation ;
  sur la première ou la dernière page, la barre inutile disparaît et l'autre garde sa moitié,
  "Précédent" à gauche et "Suivant" à droite, en lecture comme sur "Mes livres" ; sur "Mes livres", le
  pied disparaît entièrement quand tout tient sur une page ;
- texte aligné à gauche, jamais justifié ; `user-select: none` ; menu contextuel désactivé ; curseur
  agrandi (48 px, contre 16 à 32 px pour un curseur ordinaire) sur PC, flèche sur la page et main sur tout ce qui se presse. Chrome remplace par le
  petit curseur système tout curseur de plus de 32 px dont l'image déborderait de la fenêtre, donc sur
  le bas des commandes du pied : à ces endroits, le curseur système est masqué et la même image est
  dessinée sous le pointeur (`shared/large-cursor`).

### 5.2 Pagination

- Multi-colonnes CSS **par chapitre** : le chapitre courant coule dans un conteneur de
  `column-count` colonnes (une, ou deux en double page, séparées par la gouttière `--spread-gap`),
  qui remplissent exactement la zone de texte ; les colonnes en trop débordent à droite. Une page est
  une colonne, une vue montre une ou deux pages ; tourner décale le conteneur d'une vue (pages et
  gouttières comprises) ; passer la dernière vue d'un chapitre affiche le suivant à sa première page,
  reculer depuis la première affiche le précédent à sa dernière vue. Un chapitre commence toujours
  sur une page de gauche : un chapitre au nombre de pages impair laisse blanche la page de droite de
  sa dernière vue. La feuille de style choisit le nombre de pages par vue (`--pages-per-view`), que
  `DomChapterLayout` lit au rendu.
- Chapitre : suite de blocs commençant à un titre (les blocs avant le premier titre forment le
  premier chapitre), coupée entre deux paragraphes au-delà de 80 000 caractères pour les livres
  sans titres.
- L'indicateur affiche "Page 12 sur 840" dès l'ouverture, sans mettre en page d'autre chapitre que
  celui affiché. Un chapitre déjà affiché compte pour son nombre réel de pages, mémorisé par livre et
  par mise en page (version de la typographie, taille de la zone de texte et palier) ; les autres sont estimés par un calcul pur
  (`pages/reader/pagination/page-count.utils.ts`) : largeurs de caractères lues une fois au canvas, coupure des lignes
  entre les mots avec une césure approchée (mots de 7 lettres et plus, 3 de chaque côté), remplissage
  des colonnes avec deux lignes au moins de part et d'autre d'une coupure, sauf un paragraphe de trois
  lignes coupé deux et un, comme Blink. Les numéros se suivent de un en un ; seul le total s'ajuste
  (d'une page ou deux) quand un chapitre estimé est affiché pour la première fois.
- **Essai du 23 septembre 2026** (5 livres, paliers 48 à 140, zone de 1404 x 543 px, deux à neuf lignes
  par page) : total estimé à moins de 2 % du total réel, rarement plus de 5 % d'écart sur un chapitre ;
  l'estimation d'un livre entier prend 3 à 40 ms, contre 50 à 300 ms pour mettre en page tous ses
  chapitres.
- Titres jamais séparés du paragraphe suivant (`break-after: avoid`). `lang="fr"`, `hyphens: auto`,
  `overflow-wrap: anywhere` en filet (sur un téléphone, une ligne fait une vingtaine de caractères).
- Premier calcul après `document.fonts.ready`.
- Le module de pages (découpage en chapitres, page d'un rectangle, numéro de page dans le livre,
  page suivante et précédente) est pur, sans Angular, testé seul.
- **Essai du 17 septembre 2026** (1920 x 1080, Luciole, 8 gros livres du catalogue, processeur ralenti
  4 fois pour un PC modeste) : le livre entier dépasse le plafond de Blink pour Les Frères Karamazov au
  palier 140 (34 285 pages, largeur bloquée à 2^25 px, fin illisible) et demande 2,3 s pour un tome
  ordinaire (Les Misérables I) ; le plus long chapitre mesuré (65 000 caractères) se met en page en
  0,22 s, le comptage de tout Karamazov prend 5 s. D'où la pagination par chapitre.
- Ordre de grandeur au palier 32 sur 1920 x 1080, en double page : une cinquantaine de caractères
  par ligne, une vingtaine de lignes par page. L'essai du 23 septembre (estimation à 2 % près) portait
  sur l'ancienne typographie (palier 100, gras, blanc entre paragraphes) ; celui du 24 octobre (deux livres, paliers 32 à 56,
  1920, 1536 et 400 px de large) tombait à une page près sur le seul chapitre estimé : à refaire sur la nouvelle,
  qui ajoute alinéas et titres centrés au calcul.

### 5.3 Position de lecture

- Mémorisée comme (index de bloc, décalage en caractères) du premier caractère de la page, à chaque
  changement de page. Indépendante du palier.
- Lecture : dans le chapitre affiché, premier bloc dont le rectangle intersecte la colonne affichée, puis recherche
  dichotomique sur le décalage avec un `Range` d'un caractère comparé au bord gauche de la colonne.
  Restauration : le même `Range` donne un rectangle dont le bord gauche divisé par la largeur de
  colonne donne la page. `Range` est la seule API DOM utilisée ; le reste est arithmétique testée.
- Si l'index de bloc dépasse le nombre de blocs du livre reçu, reprise au début, sans message.

### 5.4 Écran "Mes livres"

- Un bloc par livre, trois par ligne, tous de la même taille quelle que soit la longueur du titre :
  un aplat pastel portant le titre en très gros, l'auteur d'un cran en dessous, une icône de son
  état (livre fermé, ouvert ou coche) et, s'il y a lieu, son état en toutes lettres ; neuf titres par
  page au plus (trois rangées).
  Ni couverture ni image de remplacement : le texte suffit à reconnaître un livre dans une
  bibliothèque de cette taille, et tout le bloc est la cible.
- Paginée par les mêmes barres que le texte, mais par rangées entières et non en multi-colonnes :
  une rangée n'est jamais coupée, et un titre long prend la place qu'il faut, jamais tronqué.
- Bibliothèque vide : une phrase centrée, "Aucun livre pour l'instant. Ils apparaîtront ici dès leur
  ajout.", sans bouton (elle n'a rien à faire, les livres arrivent au prochain rafraîchissement) ;
  pendant le premier chargement, page vide comme pour un livre (5.6).
- Ordre : livres ayant une progression, terminés compris, du plus récemment lu au plus ancien ; puis
  livres jamais ouverts, du plus récemment ajouté au plus ancien.
- Repères : le premier bloc, s'il est en cours et non terminé, est rose et porte l'étiquette
  "En cours" ; un livre terminé a un bloc atténué et l'étiquette "Terminé". Rien d'autre, et jamais
  la couleur seule.
- Ligne de tête : titre "Mes livres" à gauche, indicateur "Titres 1 à 6 sur 7" à droite ; pied réduit
  aux deux barres (maquette du design system) ; flèches gauche et droite comme sur l'écran de lecture,
  espace et Entrée activent le bloc focalisé. Le titre "Mes livres" n'est plus affiché, il reste
  lu par le lecteur d'écran.
- Un clic sur le bloc ouvre le livre à sa dernière position ; jamais ouvert ou terminé : première page.

### 5.5 Réglages d'affichage

Globaux, lus depuis le serveur, modifiables seulement dans le backoffice. À calibrer avec elle.

| Réglage | Valeurs | Défaut |
|---|---|---|
| Palier | 28, 32, 36, 40 (pixels sur tout écran d'au moins 1280 px CSS ; en dessous, proportionnel, plancher 20 px) | 32 |
| Fixes | thème unique crème : encre brun très foncé sur papier crème, commandes ton sur ton (aplat à peine plus foncé que la page, libellé encre) ; police Luciole (400 pour le texte lu, 700 pour les titres de chapitre et de livre), interligne 1,55, paragraphes à alinéa sans blanc, titres centrés ; double page sur écran large ; repère "en cours" rose à texte sombre, une couleur de couverture par livre | |

La référence à 1280 px couvre son PC à 100 % comme à 125 % de mise à l'échelle Windows. Ctrl plus et
Ctrl moins restent le zoom de Chrome : un zoom avant ne change rien, un zoom arrière rétrécit le texte
(section 16).

### 5.6 Erreurs et cas limites

- Serveur injoignable au démarrage : un écran "Le service est indisponible, nouvel essai dans
  quelques secondes" avec un bouton "Réessayer" ; réessai automatique toutes les dix secondes,
  disparition dès que le serveur répond. Elle peut cliquer sur l'icône avant que le réseau soit prêt.
- Chargement d'un livre : fond de page seul, sans indicateur.
- Livre supprimé ou introuvable, données locales absentes ou corrompues : retour à "Mes livres" ou
  comportement de première ouverture, sans message.
- Coupure réseau en lecture : le texte est en mémoire, tourner les pages continue ; la dernière
  liste reçue est conservée pour que "Mes livres" reste affichable.

### 5.7 Rafraîchissement sans redémarrage

Le PC reste allumé des jours. L'application relit `GET /api/settings` et `GET /api/books` toutes les
dix secondes (`ETag`, `304` si inchangé) :

- palier modifié : appliqué immédiatement, même position ;
- livre ajouté : apparaît dans la liste ; livre retiré : disparaît de la liste, sans interrompre une
  lecture en cours ;
- nouvelle version de l'application (service worker) : appliquée après dix minutes sans commande,
  jamais pendant une session de lecture.

## 6. Accessibilité

WCAG 2.2 AA, plus : contraste texte et fond 7:1, cibles de 44 px minimum, aucun
contenu au survol, aucune animation ni transition. HTML sémantique (boutons réels, région `main`,
`aria-live` sur l'indicateur), clavier complet, focus visible épais, aucune icône sans libellé,
interface en français seulement. Lighthouse "Accessibility" à 100 sur `/livres`, `/lire/:id` et
`/admin`.

## 7. Contenu

### 7.1 Sources

- **Catalogue OPDS d'Ebooks libres et gratuits** (`https://www.ebooksgratuits.com/opds/`) : flux
  Atom, environ 3 000 titres français. Chaque entrée porte un identifiant (URL de la fiche), titre,
  auteur, résumé et un lien EPUB `rel="http://opds-spec.org/acquisition"` qui redirige vers un fichier
  statique (vérifié le 17 septembre 2026). Recherche OpenSearch : `feed.php?mode=search&query=…`.
- **Dépôt manuel** d'un EPUB depuis le backoffice. L'aidant assume seul les droits.

### 7.2 Recherche

Le backend relaie chaque recherche du backoffice à l'OpenSearch du flux, sans cache ni table. Le site
ignore les accents des titres mais pas ceux de la requête : le backend retire les accents de la requête
avant envoi. `User-Agent` identifiant l'application. Site injoignable : "Site du catalogue
injoignable", bouton pour réessayer.

Constats du 17 septembre 2026 : une page de 100 résultats au plus (seule la première est affichée),
auteur au format "Hugo, Victor" (affiché "Victor Hugo"), environ une entrée sur six sans EPUB (PDF ou
Mobipocket seuls), masquée car inactivable. Le lien EPUB suit toujours
`newsendbook.php?id=<n>&format=epub`, `<n>` étant le numéro de la fiche `details.php?book=<n>` de
l'identifiant ; l'activation construit ce lien depuis l'URL du site configurée, sans jamais télécharger
une adresse fournie par le client, et suit la redirection vers le fichier statique, à condition qu'elle
reste sur l'hôte du site configuré : une redirection vers un autre hôte est refusée.

### 7.3 Format interne

```json
{ "id": "…", "title": "…", "author": "…",
  "blocks": [ { "kind": "heading", "text": "Première partie" },
              { "kind": "paragraph", "text": "Il était une fois…" } ] }
```

- `kind` : `heading` ou `paragraph`. `text` : texte brut, sans balise ; italique et gras abandonnés
  (le gras ne se distinguerait pas assez, l'italique gêne en basse vision). Un bloc est un seul nœud texte, affiché
  par `textContent`.
- Retour à la ligne forcé (`<br>`) : `\n`, rendu par `white-space: pre-line` (poésie, théâtre).
- Espaces ordinaires réduites à une, paragraphes et lignes vides supprimés, espaces insécables
  (U+00A0, U+202F) conservées ; une espace ordinaire devant `; : ! ? »` ou après `«` devient
  insécable (jamais ajoutée là où il n'y a pas d'espace, pour ne pas casser `10:30` ou une URL),
  règle idempotente.

### 7.4 Conversion EPUB

Trois temps : téléchargement hors transaction, conversion pure en mémoire, transaction courte pour
persister.

1. Décompression (`java.util.zip`) avec gardes, toutes tirées de la taille maximale d'un EPUB
   (`app.catalogue.max-epub-size`, 20 Mo) : 20 Mo par fichier, 100 Mo décompressés, 10 000 entrées au
   plus, rejet des chemins contenant `..` ou commençant par `/` ; lecture de `container.xml` puis de
   l'OPF. Un document XML imbriqué sur plus de 200 niveaux est rejeté comme invalide.
2. Documents XHTML dans l'ordre du `spine`, analysés avec jsoup en mode XML (le mode HTML transforme
   un `<a id="x"/>` en lien englobant la suite) ; `linear="no"` ignorés.
3. Extraction des blocs feuilles : `h1` à `h6` vers `heading` ; `p`, `blockquote`, `li`, `div` sans
   bloc enfant vers `paragraph`. Le texte nu d'un conteneur mixte (texte, `br`, quelques `p`) devient
   des paragraphes. Balises en ligne fondues, `br` vers `\n`. Un paragraphe de 150 caractères au plus
   visé par la table des matières (NCX ou nav EPUB 3 : début de fichier ou ancre) devient `heading` :
   certains EPUB du catalogue (Atlantis Word Processor) n'ont que des `<p><b>`.
4. Supprimés : images, tableaux, notes (`aside` avec `epub:type` note), appels de note (`sup` avec
   lien, `epub:type` noteref, ou lien interne dont le texte est un numéro comme `{1}`, `[2]`, `*`),
   blocs commençant par un appel de note (corps de note avec lien retour), document fait surtout de
   tels blocs (`notes.html`, notes sur plusieurs paragraphes comprises), tables des matières et pages
   de garde (`epub:type` ou `guide` : cover, title-page, toc, copyright-page, bibliography, cette
   dernière étant la page "À propos" de Feedbooks).
5. Rejet avec message clair : chiffré (`META-INF/encryption.xml` qui déclare autre chose qu'une
   obfuscation de polices, courante et sans effet sur le texte), sans texte, trop volumineux.

Titre et auteur pris dans l'OPF, modifiables dans le backoffice.

## 8. Données locales

`localStorage` seul, sans synchronisation ; la perte (purge, changement de PC) est acceptée.

| Clé | Contenu |
|---|---|
| `reader.lastBookId` | dernier livre ouvert |
| `reader.progress.<bookId>` | `{ "blockIndex": 0, "charOffset": 0, "finished": false, "updatedAt": "…" }` |
| `reader.pages.<bookId>` | `{ "layout": "v2:1604x678:32", "counts": [4, null, 150] }`, pages des chapitres déjà affichés sous la dernière mise en page (5.2) |

## 9. Backoffice

Route `/admin` de la même application. Un bouton discret (icône engrenage, libellé accessible
seulement) en haut à droite de `/livres` y mène, destiné à l'aidant et non à l'utilisatrice ; c'est le
seul lien depuis la liseuse. Mobile first, schéma de couleurs
du système, quatre onglets : Catalogue, Bibliothèque, Dépôt, Réglages.

**Authentification** (schéma valoquests) : clé d'administration en variable d'environnement, saisie
une fois, mémorisée dans le navigateur, envoyée dans `X-Admin-Key` sur `/api/admin/**` ; verrouillage
temporaire par adresse après plusieurs échecs. Écran : un champ mot de passe, bouton "Entrer", lien "Retour aux livres" vers `/livres`,
"Clé incorrecte" ou "Trop d'essais, réessayez dans une minute" ; "Se déconnecter" dans l'en-tête.

**Fonctions** :

- Catalogue : recherche par titre ou auteur, résumé, bouton "Activer" (téléchargement, conversion,
  activation) ; entrée déjà active : "Déjà active" ; entrée retirée : "Activer" la réactive sans
  reconversion.
- Bibliothèque : tous les livres importés, actifs ou retirés (titre, auteur, source, date, état,
  "Lu" s'il est marqué), filtrables par texte (titre ou auteur, sans casse ni accents) et par état
  (Tous, Actifs, Retirés, Lus, chacun avec son effectif) ; "Retirer", "Réactiver", modification du
  titre et de l'auteur ; "Marquer comme lu" et "Marquer comme non lu" (section 4) ; "Supprimer", confirmé par "Confirmer la suppression", efface le livre et son contenu ; une entrée du catalogue supprimée se réactive par un
  nouveau téléchargement.
- Dépôt : envoi d'un EPUB, conversion, activation immédiate ; titre et auteur corrigés ensuite dans
  la Bibliothèque si besoin.
- Réglages : palier, avec un aperçu du rendu indiquant la taille réelle sur son écran.

Toute action longue désactive son bouton ("en cours") puis affiche succès ou échec avec la raison
(chiffré, sans texte, trop volumineux, catalogue injoignable, catalogue qui refuse les
téléchargements : le site renvoie alors une page HTML au lieu de l'EPUB quand il bannit une adresse).
Pendant l'action, l'icône du bouton devient un cercle qui tourne ; un dépôt de plusieurs fichiers
indique "Envoi 2 sur 3". Chargement d'une liste (Bibliothèque, Réglages, recherche du catalogue) : un
indicateur animé et une phrase qui nomme ce qui charge. Réglages ne montre aucun palier avant la
réponse du serveur, pour qu'on ne puisse pas enregistrer la valeur par défaut, et propose
"Réessayer" en cas d'échec. Rien d'autre.

## 10. API

JSON partout, erreurs au format `ApiErrorResponse` de valoquests. Réponses publiques avec `ETag` et
compression.

| Publique | Réponse |
|---|---|
| `GET /api/books` | livres actifs : `id`, `title`, `author`, `activatedAt`, `finishedAt` (marque "lu" du backoffice, `null` sinon) |
| `GET /api/books/{id}` | livre au format interne, plus `finishedAt` ; `404` si inactif ou inconnu |
| `GET /api/settings` | `{ "fontTier": 32 }` |

| Administration (`X-Admin-Key`) | Effet |
|---|---|
| `GET /api/admin/catalogue?query=` | recherche relayée au flux ; chaque entrée porte son état (jamais importée, active, retirée) ; `503` si le site ne répond pas |
| `POST /api/admin/books/from-catalogue` | `{ "entryId" }` ; téléchargement, conversion, activation, `201` ; entrée déjà importée : réactivée et renvoyée, `200` |
| `POST /api/admin/books/upload` | multipart EPUB ; conversion, activation, `201` |
| `GET /api/admin/books` | tous les livres |
| `PATCH /api/admin/books/{id}` | `title`, `author`, `active`, `finished` (`true` marque lu à l'instant, `false` retire la marque) |
| `DELETE /api/admin/books/{id}` | suppression définitive, `204` ; `404` si inconnu |
| `PUT /api/admin/settings` | `fontTier` |

## 11. Architecture

**Frontend** : Angular 22, composants autonomes, signaux, sans zone, vitest, eslint, prettier.
Tailwind 4 pour la mise en page seulement, sans preflight ni thème par défaut ; chaque composant porte
sa feuille SCSS en classes BEM sur les tokens de `tokens.css`, sans valeur en dur.
Aucune bibliothèque de composants. Routes `/`, `/livres`, `/lire/:id`, `/admin` (différé). Données
par `httpResource`, URLs dans `core/http/api-endpoints.ts`, dernière réponse valide conservée pour
les ressources interrogées périodiquement. Manifeste et service worker Angular limité aux ressources
de l'application : sans lui, un démarrage avant le réseau montre la page "Pas de connexion" de Chrome
au lieu de notre écran d'attente. Pas d'installation PWA : le raccourci kiosque suffit.

**Backend** : Spring Boot 4, Java 25, Flyway, PostgreSQL 17, springdoc, Checkstyle, SpotBugs, ArchUnit,
JaCoCo (90 % lignes, 70 % branches). Paquets `book`, `catalogue`, `conversion`, `settings`, `shared`,
en paliers vérifiés par `ArchitectureTest`. `GET /api/**` public, `/api/admin/**` protégé,
`FORWARD_HEADERS_STRATEGY=native`. Actuator sur son propre port (8081), `/readyz` et `/livez` sur le port
principal.
Client OPDS `WebClient` avec délais courts, un délai global de 60 s par appel (réessai compris,
contre un site qui répond goutte à goutte) et un réessai. Compression HTTP activée.

**Base** :

| Table | Colonnes |
|---|---|
| `book` | `id`, `title`, `author`, `source` (`catalogue` ou `upload`), `source_id` (identifiant OPDS, unique, nul pour un dépôt), `source_url`, `content` (JSONB), `block_count`, `active`, `activated_at`, `created_at`, `finished_at` (marque "lu" du backoffice, nulle sinon) |
| `reader_settings` | une ligne : `font_tier`, `updated_at` |

**Déploiement** : `https://book-reader.thomashtn.dev`. Deux images Docker, publiées sur GHCR
(`sha-<commit>`) par le workflow `Deliver` une fois les tests, l'analyse des images et le parcours
Playwright passés ; le serveur ne construit rien. Le domaine va au frontend (nginx), qui relaie `/api`
et `/readyz` au backend : même origine, backend hors du réseau public. Le contrat de déploiement est
`docs/deployment.md` ; la configuration du serveur vit sur le serveur. Limite de 20 Mo alignée dans
nginx et Spring. `robots.txt` interdisant tout et `X-Robots-Tag: noindex`. Les requêtes de chaque côté
lancent `backend-ci.yml` ou `frontend-ci.yml` ; CodeQL analyse le code à chaque poussée.

## 12. Livraison

La version 1 est livrable quand :

- l'essai multi-colonnes (5.2) est fait et sa conclusion consignée dans la section 14 ;
- tests unitaires : module de pages, tri et fin de livre, reprise quand l'index dépasse le livre,
  anti-rebond, convertisseur (structure minimale, notes et images supprimées, texte nu conservé,
  insécables, fichier chiffré rejeté), aux seuils de valoquests ; le client OPDS est testé contre un
  serveur factice (réponses Atom et EPUB enregistrées), jamais contre le site ;
- un test Playwright joue le parcours : démarrage sans livre, activation dans le backoffice, reprise,
  dix pages, retour à la liste, changement de livre, rechargement et reprise, changement de palier
  appliqué sans rechargement, serveur coupé puis rétabli, fin de livre puis retour arrière ; le
  catalogue est simulé par interception des routes ; axe-core passe sur chaque écran ;
- Lighthouse "Accessibility" à 100 sur les trois routes ;
- un passage clavier complet et un passage NVDA sur la liseuse (commandes, liste, indicateur) ;
- cinq titres du catalogue activés sur l'instance de développement.

## 14. Décisions

| Décision | Écarté | Raison |
|---|---|---|
| Backoffice en rail marine, accent bleu tampon ; Bibliothèque en liste filtrable, toutes les actions visibles sur chaque ligne dans un seul style | cartes empilées ; menu "Plus" pour les actions rares | 23 septembre 2026 : demande de l'utilisateur ; à une cinquantaine de livres les cartes devenaient illisibles, et un menu ajoute un clic à chaque action ; le rose garde son seul sens, "vous êtes ici" |
| Ebooks libres et gratuits par OPDS, plus dépôt | Gutenberg, Gallica, Éole, PNB | seul catalogue français propre avec flux ; Éole sans API et chiffré ; PNB sous DRM |
| Recherche relayée en direct | copie locale du catalogue | quelques recherches par mois ne justifient ni table ni tâche |
| Écran catalogue vide invitant à chercher | suggestions chargées à l'ouverture de l'onglet | une sélection par défaut appellerait le site à chaque visite, ce que la ligne précédente écarte |
| Classes de la liseuse préfixées `book-*` | noms nus `grid`, `card`, `cover` | 22 septembre 2026 : `grid` écrasait l'utilitaire Tailwind du backoffice et cassait la page Réglages |
| Marque "lu" du backoffice horodatée sur le serveur, appliquée par la liseuse si elle est postérieure à la dernière lecture locale | écrire la progression depuis le backoffice, drapeau "lu" permanent | 23 septembre 2026 : demande de l'utilisateur ; la progression ne vit que sur le PC de la lectrice, l'aidant agit depuis un autre appareil ; l'horodatage laisse une relecture ultérieure reprendre la main sans synchronisation |
| Suppression définitive, confirmée, à côté de "Retirer" | retrait seul | 23 septembre 2026 : demande de l'utilisateur, pour purger la bibliothèque ; la confirmation évite une perte par erreur de doigt sur mobile |
| Paliers globaux | loupe, Ctrl plus et moins | motricité fine, texte mobile, conflit avec le zoom Chrome |
| Référence 1280 px | référence 1920 px | couvre la mise à l'échelle Windows à 100 % et 125 % |
| Multi-colonnes CSS par chapitre, total estimé (voir plus bas) | livre entier en un conteneur, mesure mot par mot, pages du chapitre seul, pourcentage | essai du 17 septembre 2026 (5.2) : plafond de Blink dépassé et plus d'une seconde pour le livre entier ; le chapitre tient en 0,22 s et garde "Page 12 sur 840" |
| Position par `Range` seul | `caretPositionFromPoint` | le coin de colonne tombe dans une marge ; une seule API |
| Texte brut par bloc | `<i>`, `<b>` conservés | gras invisible, italique nuisible, position triviale |
| Pied de page, boutons en moitiés d'écran | barres verticales pleine hauteur | 17 septembre 2026 : zone de lecture élargie de 600 px sur grand écran ; cibles encore très grandes (demi-écran de large, plus hautes que l'en-tête) |
| Pied unique, aucun en-tête (remplacé le 24 octobre 2026, voir plus bas) | en-tête avec "Mes livres" et l'indicateur | 22 septembre 2026 : le texte gagne toute la hauteur de l'en-tête et les trois commandes sont au même endroit, à portée du pouce |
| Indicateur en petit dans le coin supérieur droit (remplacé le 24 octobre 2026, voir plus bas) | bande d'état au-dessus des commandes, indicateur supprimé, indicateur dans le bouton "Suivant" | 22 septembre 2026 : une bande pleine largeur donnait trop de poids à une information secondaire ; le coin la garde visible sans voler de surface au texte ni à une cible |
| Accent rose `#ffa6c1`, réservé aux commandes | tangerine `#ffa03c`, rose sur le seul thème clair | 22 septembre 2026 : demande de l'utilisateur ; le rose ne colore que ce qui s'active, donc une surface rose veut toujours dire "appuyez ici" |
| Bordure des commandes à 2 px (remplacée le 23 septembre 2026, voir plus bas) | 6 px | les aplats pleins portent les formes, un filet de 6 px alourdissait sans rien ajouter au contraste |
| Grille de trois blocs par ligne, paginée par rangées | une ligne par livre en multi-colonnes | 22 septembre 2026 : demande de l'utilisateur ; une grille ne se fragmente pas en colonnes CSS, d'où le découpage par rangées entières (`pages/library/grid.utils.ts`) |
| Grille sur 1 500 px avec des marges de 20 px, des blocs deux fois plus hauts qu'une commande et un titre plafonné à `8cqi` | grille sur 1 100 px, marges de lecture, titre à `11cqi` | 22 septembre 2026 : demande de l'utilisateur ; sur cet écran les blocs sont le contenu, donc ils prennent la largeur que les marges abandonnent, et le plafond du titre garde neuf titres par page au palier 100 sur 1080 px, barres de pagination comprises |
| Bloc plein portant le titre, l'auteur et l'état | plateau 3:4 avec l'initiale du titre, couverture extraite de l'EPUB | 22 septembre 2026 : demande de l'utilisateur ; sans couverture à afficher, le plateau ne faisait que voler la place du titre. L'auteur, d'abord écarté avec le plateau, est rétabli le même jour : il tient sur une ligne sous le titre, à `--card-author-size`, sans reprendre de place au titre |
| Barre retirée quand elle ne mène nulle part (en lecture, sa moitié reste vide depuis le 24 octobre 2026, voir plus bas) | barre laissée en place et désactivée | 22 septembre 2026 : demande de l'utilisateur ; contrepartie assumée, la cible restante change de largeur au premier et au dernier tour de page |
| Commandes sur la surface beige du thème | commandes en aplat rose | 22 septembre 2026 : demande de l'utilisateur ; le rose ne désigne plus que le livre en cours, qui devient la seule surface colorée de l'écran |
| Filet permanent de 2 px sur les blocs, aplat un ton plus soutenu au survol (remplacé le 23 septembre 2026, voir plus bas) | filet de 4 px, filet épaissi au survol | 22 septembre 2026 : demande de l'utilisateur ; 4 px alourdissaient la grille alors que la gouttière de 24 px sépare déjà les blocs, donc le survol passe par le fond, comme sur les commandes, sans rien déplacer ni révéler ; il reste un supplément pour la souris, le clavier et le tactile gardent le filet et l'anneau de focus |
| Titre de l'écran en haut à gauche de "Mes livres" | titre lu par le seul lecteur d'écran | 22 septembre 2026 : demande de l'utilisateur ; la ligne existait déjà pour l'indicateur, donc elle ne coûte pas de place |
| Indicateur de lecture en pourcentage de blocs lus (remplacé le 23 septembre 2026, voir plus bas) | indicateur "Page 12 sur 840", pourcentage de pages comptées en fond | 22 septembre 2026 : demande de l'utilisateur ; le nombre de pages varie avec le palier de police (5.2) et son comptage en fond pouvait laisser l'indicateur vide plusieurs minutes sur un gros livre (90 chapitres, essai en local), alors que l'index de bloc est connu dès l'ouverture |
| "Page 12 sur 840" : chapitres affichés comptés, les autres estimés par calcul pur, comptes mémorisés dans `localStorage` | pourcentage ; comptage en fond dans un double caché ; comptage côté serveur ; étalonnage de l'estimation sur le chapitre affiché | 23 septembre 2026 : demande de l'utilisateur. Seule la mise en page coûte ; le calcul pur l'évite entièrement, suit le palier et la fenêtre, et reste à moins de 2 % du réel (5.2). Le serveur ne connaît ni la police rendue ni la taille de la fenêtre ; l'étalonnage sur un premier chapitre souvent réduit à une page de titre donnait des totaux absurdes |
| Commandes et blocs sans bordure : commandes en aplat encre à libellé crème, blocs en aplat de couleur, arrondi de 12 px, espace de 8 px entre les barres (remplacé le 24 octobre 2026, voir plus bas) | filets de 2 px sur fond beige, angles vifs | 23 septembre 2026 : demande de l'utilisateur, pour un rendu plus moderne ; sans filet, seul un fond sombre détache une cible du papier (au moins 7,9:1), donc les commandes passent à l'encre et les blocs à des toiles sombres ; l'arrondi ne coûte rien en lisibilité et l'anneau de focus en ombre intérieure le suit |
| Une couleur de toile par livre parmi dix (lins pastel depuis le 24 octobre 2026, voir plus bas), tirée de son identifiant et décalée à la suivante libre si le voisin de gauche ou du dessus la porte déjà ; livre en cours rose, livre terminé beige pâle | même aplat pour tous les livres ; cinq toiles tirées de l'identifiant seul ; couleur selon la seule position dans la liste | 23 septembre 2026 : la DMLA ôte la vision centrale mais laisse les grandes taches de couleur en périphérie, donc un livre se retrouve à sa couleur avant d'être lu ; les couleurs ne portent aucun sens. Avec cinq toiles tirées au hasard, des voisins se répétaient (demande de l'utilisateur) ; le décalage les supprime et ne change la couleur d'un livre que lorsque l'ordre crée un conflit |
| Gras réservé au texte lu et aux titres de livres ; commandes, auteurs, étiquettes et ligne de tête en Luciole 400 (remplacé le 24 octobre 2026, voir plus bas) | tout en 700 | 23 septembre 2026 : demande de l'utilisateur ; tout en gras aplatissait la hiérarchie, le titre ressort mieux quand il est seul en gras, et Luciole 400 reste assez épaisse aux tailles des commandes |
| Message de bibliothèque vide côté liseuse, sans bouton ; indicateurs animés dans le backoffice seulement | page vide ; indicateur de chargement dans la liseuse | 23 septembre 2026 : demande de l'utilisateur, pour une application qui paraisse finie ; une page vide ressemble à une panne, une phrase dit que rien n'est cassé. La liseuse garde l'interdit d'animation (6) et le fond seul au chargement (5.6) |
| Une application Angular avec `/admin` | deux applications | un front, un back |
| `localStorage` seul, en ligne | IndexedDB, hors ligne | simplicité, perte acceptée |
| API publique | clé par poste | une seule utilisatrice |
| Contenu JSONB | table de blocs | volume négligeable |
| Composants faits main | Angular Material | tailles et animations contraires au besoin |
| Conversion serveur | parsing EPUB dans le navigateur | liseuse minuscule et testable |
| Mode kiosque | `--start-fullscreen`, PWA installée | pas de bulle ni de raccourci de sortie ; la PWA ignore les drapeaux |
| Bouton engrenage discret, libellé accessible seulement, en haut à droite de `/livres` | aucun lien depuis la liseuse, bouton avec libellé visible | 22 septembre 2026 : demande de l'utilisateur ; destiné à l'aidant, pas à l'utilisatrice, seul point d'entrée vers `/admin` depuis la liseuse |
| `page-title` fixé au palier 100, indépendant du palier choisi | `page-title` proportionnel au corps du texte (un tiers) | 22 septembre 2026 : demande de l'utilisateur ; "Mes livres" est du décor d'écran, pas du texte de lecture, il ne doit pas grossir ni rétrécir avec le palier |
| Thème unique, noir sur blanc cassé, surfaces beige (remplacé le 24 octobre 2026, voir plus bas) | trois thèmes (noir sur blanc, blanc sur noir, jaune sur noir), choisis dans le backoffice | 22 septembre 2026 : demande de l'utilisateur ; le thème clair suffit, les deux autres n'étaient jamais utilisés |
| Backoffice en CSS simple sur les tokens `--admin-*` | Tailwind 4 réservé au backoffice | 8 octobre 2026 : demande de l'utilisateur ; Tailwind ne fournissait plus qu'une unité d'espacement et `sr-only`, au prix d'un plugin PostCSS et d'un balayage des gabarits qui générait des classes à partir des mots des commentaires |
| Tailwind 4 pour la mise en page et une feuille SCSS par composant, sans preflight ni thème par défaut | CSS simple en feuilles globales | 24 octobre 2026 : demande de l'utilisateur, alignement sur ses autres projets (littlewords, valoquests) ; la collision des noms nus est écartée par les classes BEM et la lecture des seuls gabarits HTML, celle des variables par l'absence du thème par défaut ; migration vérifiée au pixel près sur 46 écrans |
| Images testées puis publiées sur GHCR, le serveur ne fait que les tirer | construction sur le serveur depuis le dépôt | 24 octobre 2026 : demande de l'utilisateur, alignement sur littlewords et jobfinder ; un commit dont les contrôles échouent n'a pas d'image, et un retour arrière ne prend que quelques secondes |
| Double page, Luciole 400 au palier 32, alinéas, titre courant séparé du texte par 48 px et numéros de page, fond crème et commandes ton sur ton ; paliers 28, 32, 36 et 40 (100 devient 32) | page unique en gras au palier 100 ; page de livre seule ; mise en page "confort" ; fonds sépia, gris, vert ou nuit ; commandes en aplat d'encre ou adoucies | 24 octobre 2026 : demande de l'utilisateur, après essai des maquettes. La lectrice se fatiguait vite : 21 caractères par ligne en gras obligeaient l'œil à changer de ligne tous les trois mots, alors qu'elle lit son application bancaire à une taille ordinaire. Le livre ouvert donne une cinquantaine de caractères par ligne ; un premier essai au palier 40 paraissait encore gros, d'où l'échelle de 28 à 40 et moins de pages à tourner ; le crème éblouit moins que le blanc cassé. Les commandes ton sur ton n'atteignent que 1,3:1 sur la page (le principe des 3:1 est levé pour elles) : choix assumé pour que l'œil ne quitte plus le texte, leur libellé encre restant à 9,6:1 |
| "Mes livres" en haut à gauche de la lecture, "Précédent" et "Suivant" chacun sous sa page, l'écart entre eux sur le pli ; une barre absente laisse sa moitié vide | trois commandes au pied, la barre restante prenant la place libérée | 24 octobre 2026 : demande de l'utilisateur ; avec le livre ouvert, chaque commande tourne la page sous laquelle elle se trouve, et une barre qui changerait de largeur au premier tour casserait cet alignement. "Mes livres" reste la première étape au clavier (Tab puis Entrée) |
| "Mes livres" sans aplat, précédé d'une flèche de retour ; texte sur 1 880 px avec des marges latérales de 16 à 32 px (marges élargies depuis, voir plus bas) | bouton en aplat ton sur ton ; texte sur 1 700 px, marges jusqu'à 48 px | 24 octobre 2026 : demande de l'utilisateur ; l'aplat alourdissait la ligne de tête, la flèche dit seule que le bouton ramène en arrière, et les marges larges coûtaient environ 150 px de texte par côté sur 1920 px |
| Marges latérales d'environ 100 px sur 1920 px ; titre du livre en gras dans le titre courant, auteur atténué | marges de 50 px ; titre et auteur dans le même style | 24 octobre 2026 : demande de l'utilisateur ; à 50 px le texte touchait presque les bords, et le titre et l'auteur se confondaient. "Précédent" et "Suivant" compacts aux deux extrémités ont été essayés le même jour puis écartés à sa demande : les grandes barres sous chaque page restent |
| Curseurs agrandis à 48 px | 64 px | 24 octobre 2026 : demande de l'utilisateur ; 64 px paraissait vraiment gros à l'écran, 48 px reste nettement plus grand qu'un curseur ordinaire |
| Pied de "Mes livres" en deux moitiés comme en lecture : "Suivant" à droite, "Précédent" à gauche, chacun de la moitié de la largeur, même seul | barre restante sur toute la largeur | 24 octobre 2026 : demande de l'utilisateur ; une barre seule sur toute la largeur était trop grosse, et une commande qui garde sa place d'un écran à l'autre se retrouve sans la chercher |
| Blocs de livres en lin pastel à texte encre, icône d'état (livre fermé, ouvert, coche) ; trois rangées de titres par page | dix toiles sombres à texte crème ; deux rangées | 24 octobre 2026 : demande de l'utilisateur ; les toiles sombres étaient trop violentes à côté du papier crème, et depuis la baisse des paliers deux rangées laissaient la moitié de l'écran vide. Le rose reste la teinte la plus saturée, donc le livre en cours se repère toujours de loin |
| Le focus revient au texte après chaque page tournée, au clavier comme au clic ; les deux pieds ("Mes livres" et lecture) partagent un seul composant qui reçoit aussi les flèches et l'anti-rebond | focus rendu après un clic seulement, pied et clavier recopiés dans chaque écran | 24 octobre 2026 : revue du code ; un seul endroit décide quand une commande passe, et le texte garde le focus quelle que soit la façon de tourner |
| La première mise en page attend les réglages (ou leur échec) ; après un changement de taille, une vue en début de chapitre y reste | mise en page immédiate puis refaite au palier reçu ; position seule pour retrouver la page | 24 octobre 2026 : revue du code ; en ouvrant `/lire/:id` directement la page changeait de taille sous ses yeux, et une page de titre seule sur sa page partage sa position avec la page suivante, qui renvoyait alors sur le titre |
| Redirections du catalogue limitées à l'hôte configuré, délai global par appel, gardes EPUB sur le nombre d'entrées et la profondeur XML | suivre toute redirection ; délais de connexion et de lecture seuls | 24 octobre 2026 : revue du code ; un site détourné ne doit pas faire appeler une autre adresse au serveur, ni le bloquer en répondant goutte à goutte, ni le faire tomber avec une archive piégée |

## 15. Vitrine

Le dépôt est public. Fait partie de "terminé" : un README (la lectrice, les trois commandes, captures
à 1920 et 400 px, schéma d'architecture, lien vers l'instance, badges CI,
crédits Luciole CC BY, Atkinson Hyperlegible SIL OFL, Ebooks libres et gratuits) ; ce document et le
design system ; le module de pages et le convertisseur testés comme des spécifications, avec fixtures
EPUB versionnées ; CI, images Docker, Compose de production, OpenAPI en développement, licence.

## 16. Installation du poste

Hors périmètre, mais l'application en dépend.

- Raccourci Chrome : `--user-data-dir` vers un profil dédié (les drapeaux ne s'appliquent qu'à la
  première instance), `--kiosk <url>`, `--no-first-run`, `--disable-session-crashed-bubble`. Sortie
  par Alt+F4.
- Chrome : ne pas effacer les données de site à la fermeture, pas d'enregistrement de mots de passe,
  pas de notifications.
- Windows : ouverture de session automatique, icône du raccourci seule sur le bureau, en grand, veille
  écran sans mot de passe, mises à jour la nuit.
- Zoom : Ctrl + molette persiste pour le site et n'est pas bloqué par le kiosque ; vérifier à chaque
  visite, Ctrl + 0 remet à 100 %.
- Vérification : éteindre, rallumer, cliquer sur l'icône ; la page de lecture doit apparaître en plein
  écran, à la bonne position.
