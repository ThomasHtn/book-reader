# Contributing

This guide is for whoever takes over the project: where everything lives, which rules the code follows
and which tools enforce them. The reasons behind functional choices are in the
[specification](docs/specification.md), the visual ones in the [design system](docs/design-system.md).
Both are written in French. Any change of behaviour goes through the specification first (section 14
holds the decision log).

## Up and running

You need Java 25, Node 22 and Docker. Then, the first time:

```bash
make setup
```

And every day:

```bash
make dev
```

That starts PostgreSQL in Docker, the API on http://localhost:8080 and the app on http://localhost:4200.
The backoffice (`/admin`) takes the demo key **book-reader-demo-admin-key-0123456789**. Ctrl+C stops the
API and the app, the database keeps your books.

Type `make` alone to see every shortcut. Each one wraps a plain command, so make is a convenience, never
a requirement.

## Try the real thing

The whole app from its Docker images, exactly as a server runs it, on http://localhost:8000:

```bash
make reset up
make e2e
```

The browser tests replay the reader journey of specification section 12, with axe-core on every screen.
They start from an empty library, hence the `reset`. The images read your `backend/.env` when it
exists, and `make e2e` signs in with its key.

Done:

```bash
make down
```

## The daily loop

1. Read the section of the specification that covers the task.
2. Write a test that fails, then make it pass.
3. Tidy up, then run every check the CI runs:

```bash
make fix
make verify
```

Green here means green on GitHub. Coverage floors only ever go up: 90 % of lines on both sides.

## What lives where

```text
backend/            the API (Spring Boot): EPUB conversion, OPDS catalogue, books, settings
frontend/           the reader and its backoffice (Angular), served by nginx, which relays /api
docs/               specification, design system, deployment contract, README media
tools/tour/         films the README tour and screens from the real app (tools/tour/README.md)
compose.yaml        the whole app on your machine, also started by every delivery
```

The backend and frontend READMEs hold the day-to-day commands and the code map of each side.

## House rules

- The interface speaks French. Everything else is English: code, comments, tests, logs, commit messages.
- Small functions, names that explain themselves, no dead code, no magic numbers.
- Something moves to shared only when a second place needs it.
- The reader has exactly three commands (next, previous, "Mes livres"). No screen, shortcut, message or
  confirmation is ever added on the reader side.
- Never log the administrator key.

## Comments

Every declaration gets a one-sentence comment that says why, private ones included:

```ts
/**
 * Last valid book list, kept through failed polls so "Mes livres" stays available offline.
 */
```

The format follows the file:

```text
.java .ts .js .mjs                /** ... */ above every declaration
.html                             <!-- ... --> above each meaningful block
.scss .css                        /* ... */ file header, one line above each rule
.sql                              -- ... above each statement
.properties .env.example .yml     # === section headers, # ... above keys that need it
```

Backend test methods are named by their @DisplayName instead. Checkstyle and ESLint fail on a missing
comment.

## Backend rules

- One package per feature, split into controller, dto, entity, repository and service. Shared code
  goes in shared, which depends on no feature.
- Packages only use the tiers below them (see the backend README), and only services touch
  repositories. Another feature's data goes through its service. ArchitectureTest checks it.
- A service is an interface plus its Default implementation, documented on the interface.
- DTOs are records with @Schema. Controllers carry @Tag, @Operation and @ApiResponse.
- Errors are thrown, and only exception handlers render them: GlobalExceptionHandler for the shared
  ones, CatalogueExceptionHandler for EPUB and catalogue failures. Error codes are a contract with
  `frontend/src/app/core/admin/admin-message.utils.ts`: change one on both sides or not at all.
- Constructor injection and typed settings (ApplicationProperties, CatalogueProperties), never @Value.
- Flyway owns the schema. Never edit an applied migration: add the next V<n>__<subject>.sql.
- Conversion runs in three steps: download outside any transaction, pure in-memory conversion, short
  transaction to persist.
- A SpotBugs false positive shared by the whole codebase goes in config/spotbugs/exclude.xml with its
  reason. A one-off gets a justified @SuppressFBWarnings.

## Frontend rules

- Standalone OnPush components, signals, zoneless. Services use @Service() and inject().
- Imports go core, then shared, then pages, never upwards, and a page never imports another page. Other
  folders are reached through the @core, @shared and @pages aliases. ESLint checks it.
- Data comes through httpResource, URLs through API_ENDPOINTS.
- One suffix per role: x.ts, x.html, x.scss, x.spec.ts, x.model.ts, x.constants.ts, x.utils.ts, and
  x.fixtures.ts for tests.
- Tailwind for layout only, in the templates. Everything visual goes in the component's .scss, in BEM
  classes on the tokens of `src/styles/tokens.css`, a verbatim copy of `docs/design-system/tokens.css`
  (edit the source, then copy it). A utility never sets a property the component's .scss also sets: the
  .scss would win.
- The reader follows the forbidden list of design system section 9: no hard-coded value, no transition,
  no border, contrast 7:1, targets of 44 px at least.
- Every DOM measurement goes through ChapterLayout (`pages/reader/pagination/pagination.model.ts`); the
  pagination computation stays pure and is tested on its own.

## Recipes

**A new endpoint**: a DTO, the service interface and its implementation, a documented controller
method, and an API test extending PostgreSqlIntegrationTest. On the frontend, its URL in API_ENDPOINTS
and its type in a .model.ts.

**A new table**: a migration, an entity, a repository, an integration test.

**A new backoffice view**: a folder in `pages/admin` with its .ts, .html, .scss and .spec.ts, a route
in `admin.routes.ts` and a link in `admin-shell.html`. It reuses the `a-*` primitives of
`pages/admin/styles/` and keeps its own rules in its .scss.

**Touch the pagination**: read section 5.2 of the specification. The pure computation
(`page-math.utils.ts`, `chapters.utils.ts`, `page-count.utils.ts`) is tested with Vitest; the real
measurement (DomChapterLayout) can only be checked in a browser, through `make e2e`.

**Refresh the README tour and screens**: `tools/tour/tour.sh`, on a stack of its own
([tools/tour/README.md](tools/tour/README.md)).

## Shipping a release

Set the version on both sides:

```bash
make version VERSION=1.1.0
```

Commit, then tag:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

The delivery checks that the tag matches both versions, publishes the images 1.1.0 and 1.1, and writes
the GitHub release from the commits. Commit messages follow Conventional Commits (fix(reader): ...), so
the notes sort themselves.

## What the CI does

- **A pull request** runs the checks of the side it touches.
- **A push to main** runs both, builds both images, starts them, scans them, drives them with the
  Playwright journey, and only then pushes them to GHCR. A failed commit has no image, so it can never
  be deployed.
- **CodeQL** reads the Java, TypeScript and workflows on every push and once a week.
- **Dependabot** groups the weekly bumps of each ecosystem, base images included.

## Pitfalls

**npm install crashes**: npm 10.9 trips on jsdom's optional canvas dependency. Use npm 11:

```bash
npx npm@11 install
```

**Playwright cannot find its browser**: install it once, from the frontend folder:

```bash
npx playwright install chromium
```

**One test class with -Dtest skips the @Nested ones**: run the whole suite.

**Strange compilation errors**: the IDE left broken classes in backend/target. Build with clean.

**The image scan fails a delivery**: it names the package. Bump the base image or the Spring Boot
managed version in pom.xml, never silence the scan.

**ebooksgratuits.com**: never download EPUBs in bulk, the site bans the address after a handful of
files. The tests only talk to a fake server, and the browser tests intercept the catalogue.
