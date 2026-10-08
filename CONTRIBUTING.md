# Contributing

This guide is for whoever takes over the project. It says where everything lives, which rules the
code follows and which tools enforce them. The reasons behind functional choices are in the
[specification](docs/specification.md); the visual ones, in the [design system](docs/design-system.md).
Both are written in French.

## Before writing a line

1. Read the section of the specification that covers the task. Any change of behaviour goes through
   that document first (section 14 holds the decision log).
2. Write the test that describes the expected behaviour, watch it fail, then write the code.
3. Let the tools fix the form (`npm run fix`, `./mvnw spotless:apply`) and read what they cannot fix.

## Setup

```bash
cd backend && cp .env.example .env     # then set ADMIN_API_KEY (32 characters or more)
cd frontend && npx npm@11 install      # also installs the git pre-commit hook
```

Requirements: Java 25, Node 22, Docker (backend tests start a PostgreSQL 17 Testcontainer).

## Code map

### Backend (`backend/src/main/java/io/github/thomashtn/bookreader`)

| Package | Role |
|---|---|
| `book` | Books: public API (`/api/books`) and backoffice, JSONB entity, projection without content |
| `catalogue` | Search relayed to the OPDS catalogue, activation of a title (download, then conversion) |
| `conversion` | EPUB to the internal format (flat list of blocks), pure and free of Spring |
| `settings` | Global display settings, a single database row |
| `shared/config` | Spring configuration: typed properties, OpenAPI, clock, cache headers |
| `shared/security` | `X-Admin-Key` admin key, per-IP lockout, Spring Security chain |
| `shared/exception` | `ApiErrorResponse` and `GlobalExceptionHandler`, the only source of error responses |

Every business package follows the same layout: `controller`, `dto`, `entity`, `repository`,
`service`.

### Frontend (`frontend/src/app`)

| Folder | Role |
|---|---|
| `core/http` | API URLs (`api-endpoints.ts`), response models, HTTP status reading |
| `core/reader` | Shared reader state: server polling, progress in `localStorage`, commands |
| `core/admin` | Backoffice session and calls, result messages |
| `pages/start` | `/`: resumes the last book or opens the list |
| `pages/library` | `/livres`: book grid paged by rows, cover colours |
| `pages/reader` | `/lire/:id`: reading screen; `pagination/` holds the pure computation and the DOM measurement |
| `pages/admin` | `/admin`, lazy-loaded: catalogue, library, upload, settings |
| `shared` | Reused components: navigation bar, book card, unavailability screen |
| `testing` | Test doubles, excluded from the build |

A screen is a trio `x.ts`, `x.html`, `x.spec.ts`. A screen's pure functions go in `x.utils.ts`, its
types in `x.model.ts`, each with its own spec.

## Conventions

### Comments

No declaration without a comment, private or not: class, field, method, constant, type, interface
property. The comment says why, or under which constraint, in one short sentence, and does not
repeat the name. It is always written on several lines:

```ts
/**
 * Last valid book list, kept through failed polls so "Mes livres" stays available offline.
 */
public readonly books = lastValidValue(this.booksResource);
```

In HTML templates, a one-line comment above each block that deserves one (`<!-- ... -->`). In CSS,
a header per file and one line above each rule. Checkstyle (backend) and ESLint (frontend) reject an
undocumented declaration.

Code, comments, identifiers, tests and logs are in English; the user interface, the specification
and the design system are in French.

### Backend

- A service called by a controller is an interface plus a `Default*` implementation; the contract's
  Javadoc sits on the interface.
- DTOs are `record`s annotated `@Schema`; controllers carry `@Tag`, `@Operation`, `@ApiResponse`.
- An error is thrown (`ResourceNotFoundException`, `InvalidRequestException`, domain exceptions) and
  `GlobalExceptionHandler` translates it. A controller never builds an error response. The returned
  `code` values are a contract with `frontend/src/app/core/admin/admin-message.ts`.
- Constructor injection only. Configuration goes through typed, validated properties
  (`ApplicationProperties`, `CatalogueProperties`), never `@Value`.
- Never edit a Flyway migration that has already run: Flyway checks every file's checksum, comments
  included. Every change is a new `V<n>__<subject>.sql` migration.

### Frontend

- Standalone components, signals, zoneless; `@Service()` for services.
- Data goes through `httpResource`, URLs through `API_ENDPOINTS`: a component never builds a URL.
- The reader only uses the tokens of `src/styles/tokens.css`, a verbatim copy of
  `docs/design-system/tokens.css` (edit the source, then copy it). The forbidden list is in section 9
  of the design system: no transition, no border, no hard-coded value, three commands and nothing
  else.
- The backoffice has its own visual register, in plain CSS on the `--admin-*` tokens:
  `pages/admin/admin.css` imports the sections of `pages/admin/styles/` in cascade order, and spacing
  is a multiple of `--admin-spacing`. No CSS framework.
- Every DOM measurement goes through `ChapterLayout` (`pages/reader/pagination/chapter-layout.ts`);
  the pagination computation stays pure and is tested on its own.

## Automated quality

| Command | Effect |
|---|---|
| `cd frontend && npm run fix` | Fixes what can be fixed: import order, comment layout, ESLint, stylelint, Prettier |
| `cd frontend && npm run lint` | ESLint (TypeScript, templates, accessibility, comments) and stylelint |
| `cd frontend && npm run format:check` | Checks Prettier formatting |
| `cd backend && ./mvnw spotless:apply` | Fixes unused imports, import order, trailing whitespace |
| `cd backend && ./mvnw clean verify` | Spotless, Checkstyle, tests, SpotBugs, JaCoCo coverage (90 % lines, 70 % branches) |

**Pre-commit hook.** `npm install` in `frontend/` links `scripts/git-hooks/pre-commit` into
`.git/hooks` without touching other hooks. On every commit, it runs the fixers on the staged files
only (configuration in `.lintstagedrc.mjs`), stages the result again and blocks the commit when an
error needs a human, a missing comment for instance.

**Continuous integration.** Three GitHub workflows, triggered by the paths changed: backend
(`clean verify`), frontend (format, lint, tests, build) and end-to-end (Playwright and axe-core).

## Recipes

**Add an endpoint.** A `record` DTO in `dto/`, a method on the service interface then in
`Default*Service`, a controller method documented for OpenAPI, an API test in
`src/test/.../<package>/*ApiTest.java` (it extends `PostgreSqlIntegrationTest`). On the frontend:
the URL in `API_ENDPOINTS`, the type in `api.model.ts` or `admin.model.ts`.

**Add a backoffice view.** A `pages/admin/<view>/` folder with `admin-<view>.ts`, `.html`,
`.spec.ts`, a route in `admin.routes.ts`, a link in `admin-shell.html`, its own styles in
`pages/admin/styles/<view>.css` imported by `admin.css` before `responsive.css`.

**Touch the pagination.** Read section 5.2 of the specification. The pure computation
(`page-math.ts`, `chapters.ts`, `page-count.ts`) is tested with Vitest; the real measurement
(`DomChapterLayout`) can only be checked in a browser, through `npm run e2e`.

## Known pitfalls

- `-Dtest=` does not select `@Nested` classes: run the whole suite.
- The IDE may write broken classes into `backend/target/`: always `clean`.
- npm 10.9 crashes on jsdom's optional `canvas` dependency: install with `npx npm@11 install`
  (`npm ci` works).
- Never download EPUBs in bulk from ebooksgratuits.com: the site bans the IP address after a few
  files. The tests never call the site.
- End-to-end tests start from an empty database: recreate it before each `npm run e2e`.
