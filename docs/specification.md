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
taille et thème réglés depuis le backoffice ; backoffice avec recherche dans le catalogue d'Ebooks
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
3. Barre droite "Suivant", barre gauche "Précédent".
4. Bouton "Mes livres" : la liste ; un clic sur un titre ouvre le livre à sa dernière position.
5. Fin de livre : la dernière page affiche "Fin du livre" sous le dernier paragraphe, le livre passe
   "terminé" mais reste en tête de liste tant qu'il est le dernier lu. Il n'est plus repris
   automatiquement ; le rouvrir repart de la première page ; reculer depuis la dernière page retire
   "terminé".

Aucun autre parcours n'existe côté lectrice.

## 5. Liseuse

### 5.1 Écran de lecture

De gauche à droite : barre "Précédent" (pleine hauteur, 300 px, flèche puis libellé), zone de texte
(une page, sans défilement), barre "Suivant" (symétrique). Au-dessus de la zone de texte, sur une
ligne : bouton "Mes livres" et indicateur "Page 12 sur 840". Sous 1100 px de large, les barres passent
en bas, côte à côte.

Règles :

- rien d'autre dans la zone de texte : ni titre courant, ni chapitre, ni icône ; la première page
  d'un livre affiche son titre et son auteur avant le texte ;
- clavier : flèche droite et espace pour "Suivant", flèche gauche pour "Précédent". Espace est
  intercepté au niveau du document et le focus revient à la zone de lecture après tout clic, pour
  qu'espace signifie toujours "Suivant". Entrée garde son rôle natif : après un clic le focus n'est
  jamais sur un bouton, et au clavier seul c'est la seule façon d'activer "Mes livres" (passage
  clavier complet, section 12). Aucun autre raccourci ;
- anti-rebond : une commande reçue moins de 400 ms après la précédente est ignorée, la répétition
  automatique d'une touche maintenue est neutralisée ;
- les barres réagissent sur toute leur surface, avec un changement de couleur net, sans animation ;
  sur la première ou la dernière page, la barre inutile reste en place, désactivée ;
- texte aligné à gauche, jamais justifié ; `user-select: none` ; menu contextuel désactivé ; curseur
  agrandi (64 px) sur PC.

### 5.2 Pagination

- Multi-colonnes CSS **par chapitre** : le chapitre courant coule dans un conteneur dont les colonnes
  ont la taille exacte de la zone de texte, `column-gap: 0`. Une page est une colonne ; tourner la page
  décale le conteneur d'une largeur de colonne ; passer la dernière page d'un chapitre affiche le
  suivant à sa première page, reculer depuis la première affiche le précédent à sa dernière.
- Chapitre : suite de blocs commençant à un titre (les blocs avant le premier titre forment le
  premier chapitre), coupée entre deux paragraphes au-delà de 80 000 caractères pour les livres
  sans titres.
- Total de pages : un conteneur caché de même taille met en page les autres chapitres un par un,
  sans bloquer les commandes, les chapitres précédant la position d'abord. L'indicateur affiche
  "Page 12" dès que les chapitres précédents sont comptés, "Page 12 sur 840" quand tous le sont ;
  vide avant. Tout changement de palier, de thème ou de taille de fenêtre relance le comptage.
- Titres jamais séparés du paragraphe suivant (`break-after: avoid`). `lang="fr"`, `hyphens: auto`,
  `overflow-wrap: anywhere` en filet (à 140 px une ligne fait quinze caractères).
- Premier calcul après `document.fonts.ready`.
- Le module de pages (découpage en chapitres, page d'un rectangle, numéro de page dans le livre,
  page suivante et précédente) est pur, sans Angular, testé seul.
- **Essai du 17 septembre 2026** (1920 x 1080, Luciole, 8 gros livres du catalogue, processeur ralenti
  4 fois pour un PC modeste) : le livre entier dépasse le plafond de Blink pour Les Frères Karamazov au
  palier 140 (34 285 pages, largeur bloquée à 2^25 px, fin illisible) et demande 2,3 s pour un tome
  ordinaire (Les Misérables I) ; le plus long chapitre mesuré (65 000 caractères) se met en page en
  0,22 s, le comptage de tout Karamazov prend 5 s. D'où la pagination par chapitre.
- Ordre de grandeur au palier 100 sur 1920 x 1080 : 21 caractères par ligne, 6 lignes par page,
  plusieurs milliers de pages par roman. Accepté.

### 5.3 Position de lecture

- Mémorisée comme (index de bloc, décalage en caractères) du premier caractère de la page, à chaque
  changement de page. Indépendante du palier et du thème.
- Lecture : dans le chapitre affiché, premier bloc dont le rectangle intersecte la colonne affichée, puis recherche
  dichotomique sur le décalage avec un `Range` d'un caractère comparé au bord gauche de la colonne.
  Restauration : le même `Range` donne un rectangle dont le bord gauche divisé par la largeur de
  colonne donne la page. `Range` est la seule API DOM utilisée ; le reste est arithmétique testée.
- Si l'index de bloc dépasse le nombre de blocs du livre reçu, reprise au début, sans message.

### 5.4 Écran "Mes livres"

- Une ligne par livre : titre en très gros, auteur en plus petit dessous. Paginée par les mêmes
  barres et le même multi-colonnes que le texte, chaque ligne étant insécable : un titre long prend
  la place qu'il faut, jamais tronqué.
- Ordre : livres ayant une progression, terminés compris, du plus récemment lu au plus ancien ; puis
  livres jamais ouverts, du plus récemment ajouté au plus ancien.
- Repères : la première ligne, si elle est en cours et non terminée, a un fond tangerine ; un livre
  terminé porte l'étiquette "Terminé" en texte atténué. Rien d'autre.
- En-tête : titre "Mes livres" et indicateur "Titres 1 à 4 sur 7" (maquette du design system) ;
  flèches gauche et droite comme sur l'écran de lecture, espace et Entrée activent la ligne focalisée.
- Un clic ouvre le livre à sa dernière position ; jamais ouvert ou terminé : première page.

### 5.5 Réglages d'affichage

Globaux, lus depuis le serveur, modifiables seulement dans le backoffice. À calibrer avec elle.

| Réglage | Valeurs | Défaut |
|---|---|---|
| Palier | 48, 72, 100, 140 (pixels sur tout écran d'au moins 1280 px CSS ; en dessous, proportionnel, plancher 20 px) | 100 |
| Thème | noir sur blanc cassé, blanc sur noir, jaune sur noir | noir sur blanc cassé |
| Fixes | police Luciole 700, interligne 1,4, accent tangerine à texte sombre | |

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

- palier ou thème modifié : appliqué immédiatement, même position ;
- livre ajouté : apparaît dans la liste ; livre retiré : disparaît de la liste, sans interrompre une
  lecture en cours ;
- nouvelle version de l'application (service worker) : appliquée après dix minutes sans commande,
  jamais pendant une session de lecture.

## 6. Accessibilité

WCAG 2.2 AA, plus : contraste texte et fond 7:1 dans tous les thèmes, cibles de 44 px minimum, aucun
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
une adresse fournie par le client, et suit la redirection vers le fichier statique.

### 7.3 Format interne

```json
{ "id": "…", "title": "…", "author": "…",
  "blocks": [ { "kind": "heading", "text": "Première partie" },
              { "kind": "paragraph", "text": "Il était une fois…" } ] }
```

- `kind` : `heading` ou `paragraph`. `text` : texte brut, sans balise ; italique et gras abandonnés
  (le corps est déjà gras, l'italique gêne en basse vision). Un bloc est un seul nœud texte, affiché
  par `textContent`.
- Retour à la ligne forcé (`<br>`) : `\n`, rendu par `white-space: pre-line` (poésie, théâtre).
- Espaces ordinaires réduites à une, paragraphes et lignes vides supprimés, espaces insécables
  (U+00A0, U+202F) conservées ; une espace ordinaire devant `; : ! ? »` ou après `«` devient
  insécable (jamais ajoutée là où il n'y a pas d'espace, pour ne pas casser `10:30` ou une URL),
  règle idempotente.

### 7.4 Conversion EPUB

Trois temps : téléchargement hors transaction, conversion pure en mémoire, transaction courte pour
persister.

1. Décompression (`java.util.zip`) avec gardes : 20 Mo par fichier, 100 Mo décompressés, rejet des
   chemins contenant `..` ou commençant par `/` ; lecture de `container.xml` puis de l'OPF.
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
5. Rejet avec message clair : chiffré (`META-INF/encryption.xml`), sans texte, trop volumineux.

Titre et auteur pris dans l'OPF, modifiables dans le backoffice.

## 8. Données locales

`localStorage` seul, sans synchronisation ; la perte (purge, changement de PC) est acceptée.

| Clé | Contenu |
|---|---|
| `reader.lastBookId` | dernier livre ouvert |
| `reader.progress.<bookId>` | `{ "blockIndex": 0, "charOffset": 0, "finished": false, "updatedAt": "…" }` |

## 9. Backoffice

Route `/admin` de la même application, sans lien depuis la liseuse. Mobile first, schéma de couleurs
du système, quatre onglets : Catalogue, Bibliothèque, Dépôt, Réglages.

**Authentification** (schéma valoquests) : clé d'administration en variable d'environnement, saisie
une fois, mémorisée dans le navigateur, envoyée dans `X-Admin-Key` sur `/api/admin/**` ; verrouillage
temporaire par adresse après plusieurs échecs. Écran : un champ mot de passe, bouton "Entrer",
"Clé incorrecte" ou "Trop d'essais, réessayez dans une minute" ; "Se déconnecter" dans l'en-tête.

**Fonctions** :

- Catalogue : recherche par titre ou auteur, résumé, bouton "Activer" (téléchargement, conversion,
  activation) ; entrée déjà active : "Déjà active" ; entrée retirée : "Activer" la réactive sans
  reconversion.
- Bibliothèque : tous les livres importés, actifs ou retirés (titre, auteur, source, date, état) ;
  "Retirer", "Réactiver", modification du titre et de l'auteur.
- Dépôt : envoi d'un EPUB, conversion, activation immédiate ; titre et auteur corrigés ensuite dans
  la Bibliothèque si besoin.
- Réglages : palier et thème, avec un aperçu du rendu indiquant la taille réelle sur son écran.

Toute action longue désactive son bouton ("en cours") puis affiche succès ou échec avec la raison
(chiffré, sans texte, trop volumineux, catalogue injoignable, catalogue qui refuse les
téléchargements : le site renvoie alors une page HTML au lieu de l'EPUB quand il bannit une adresse).
Rien d'autre.

## 10. API

JSON partout, erreurs au format `ApiErrorResponse` de valoquests. Réponses publiques avec `ETag` et
compression.

| Publique | Réponse |
|---|---|
| `GET /api/books` | livres actifs : `id`, `title`, `author`, `activatedAt` |
| `GET /api/books/{id}` | livre au format interne ; `404` si inactif ou inconnu |
| `GET /api/settings` | `{ "fontTier": 100, "theme": "dark-on-light" }` |

| Administration (`X-Admin-Key`) | Effet |
|---|---|
| `GET /api/admin/catalogue?query=` | recherche relayée au flux ; chaque entrée porte son état (jamais importée, active, retirée) ; `503` si le site ne répond pas |
| `POST /api/admin/books/from-catalogue` | `{ "entryId" }` ; téléchargement, conversion, activation, `201` ; entrée déjà importée : réactivée et renvoyée, `200` |
| `POST /api/admin/books/upload` | multipart EPUB ; conversion, activation, `201` |
| `GET /api/admin/books` | tous les livres |
| `PATCH /api/admin/books/{id}` | `title`, `author`, `active` |
| `PUT /api/admin/settings` | `fontTier`, `theme` |

## 11. Architecture

**Frontend** : Angular 22, composants autonomes, signaux, sans zone, vitest, eslint, prettier.
Tailwind 4 pour le backoffice seulement ; la liseuse n'utilise que `tokens.css`, sans valeur en dur.
Aucune bibliothèque de composants. Routes `/`, `/livres`, `/lire/:id`, `/admin` (différé). Données
par `httpResource`, URLs dans `core/http/api-endpoints.ts`, dernière réponse valide conservée pour
les ressources interrogées périodiquement. Manifeste et service worker Angular limité aux ressources
de l'application : sans lui, un démarrage avant le réseau montre la page "Pas de connexion" de Chrome
au lieu de notre écran d'attente. Pas d'installation PWA : le raccourci kiosque suffit.

**Backend** : Spring Boot 4, Java 25, Flyway, PostgreSQL 17, spring-dotenv, springdoc, Checkstyle,
SpotBugs, JaCoCo (90 % lignes, 70 % branches). Paquets `book`, `catalogue`, `conversion`,
`settings`, `shared`. `GET /api/**` public, `/api/admin/**` protégé, `FORWARD_HEADERS_STRATEGY=framework`.
Client OPDS `WebClient` avec délais courts et un réessai. Compression HTTP activée.

**Base** :

| Table | Colonnes |
|---|---|
| `book` | `id`, `title`, `author`, `source` (`catalogue` ou `upload`), `source_id` (identifiant OPDS, unique, nul pour un dépôt), `source_url`, `content` (JSONB), `block_count`, `active`, `activated_at`, `created_at` |
| `reader_settings` | une ligne : `font_tier`, `theme`, `updated_at` |

**Déploiement** : `https://book-reader.thomashtn.dev`. Deux images Docker (nginx pour le bundle, jar
Spring) derrière Traefik sur le VPS, même origine, `/api/*` vers le backend, base PostgreSQL existante avec base et rôle dédiés. `.env`
documenté dans `.env.example` (base, `ADMIN_API_KEY`, URL du flux, `API_DOCS_ENABLED`). Limite de
20 Mo alignée dans nginx, Traefik et Spring. `robots.txt` interdisant tout et `X-Robots-Tag: noindex`.
Limitation de débit Traefik sur `/api/**`. CI GitHub Actions `backend-ci.yml` et `frontend-ci.yml`
par chemin.

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
| Ebooks libres et gratuits par OPDS, plus dépôt | Gutenberg, Gallica, Éole, PNB | seul catalogue français propre avec flux ; Éole sans API et chiffré ; PNB sous DRM |
| Recherche relayée en direct | copie locale du catalogue | quelques recherches par mois ne justifient ni table ni tâche |
| Paliers globaux | loupe, Ctrl plus et moins | motricité fine, texte mobile, conflit avec le zoom Chrome |
| Référence 1280 px | référence 1920 px | couvre la mise à l'échelle Windows à 100 % et 125 % |
| Multi-colonnes CSS par chapitre, total compté en fond | livre entier en un conteneur, mesure mot par mot, pages du chapitre seul, pourcentage | essai du 17 septembre 2026 (5.2) : plafond de Blink dépassé et plus d'une seconde pour le livre entier ; le chapitre tient en 0,22 s et garde "Page 12 sur 840" |
| Position par `Range` seul | `caretPositionFromPoint` | le coin de colonne tombe dans une marge ; une seule API |
| Texte brut par bloc | `<i>`, `<b>` conservés | gras invisible, italique nuisible, position triviale |
| Barres pleine hauteur | boutons en bas, moitiés d'écran | périphérie conservée, cibles impossibles à manquer |
| Une application Angular avec `/admin` | deux applications | un front, un back |
| `localStorage` seul, en ligne | IndexedDB, hors ligne | simplicité, perte acceptée |
| API publique | clé par poste | une seule utilisatrice |
| Contenu JSONB | table de blocs | volume négligeable |
| Composants faits main | Angular Material | tailles et animations contraires au besoin |
| Conversion serveur | parsing EPUB dans le navigateur | liseuse minuscule et testable |
| Mode kiosque | `--start-fullscreen`, PWA installée | pas de bulle ni de raccourci de sortie ; la PWA ignore les drapeaux |

## 15. Vitrine

Le dépôt est public. Fait partie de "terminé" : un README (la lectrice, les trois commandes, captures
à 1920 et 400 px dans les trois thèmes, schéma d'architecture, lien vers l'instance, badges CI,
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
