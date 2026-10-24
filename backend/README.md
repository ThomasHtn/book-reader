# Book Reader backend

The library behind the Liseuse: a Spring Boot API on Java 25 that turns EPUB files into plain text
blocks, relays the OPDS catalogue, keeps the display settings and serves it all to the reader.

## Start

From the backend folder, the first time:

```bash
cp .env.example .env
```

Then every day:

```bash
make -C .. db
./mvnw spring-boot:run
```

The API answers on http://localhost:8080. The backoffice key of the demo settings is
**book-reader-demo-admin-key-0123456789**.

## Before committing

```bash
./mvnw spotless:apply
./mvnw clean verify
```

The second one runs every check the CI runs: Spotless, Checkstyle, the tests, SpotBugs, the
architecture rules and the JaCoCo floors (90 % of lines, 70 % of branches). Keep Docker up: the tests
bring their own PostgreSQL 17.

## Run a single test class

```bash
./mvnw test -Dtest=ReaderSettingsApiTest
```

## Browse the API

`API_DOCS_ENABLED=true` is already in the demo settings: open http://localhost:8080/swagger-ui.html.
It stays off in production, since the document maps every administrative route.

## Administrator key

The backend refuses to start without one, 32 characters or more. To make a real one:

```bash
openssl rand -base64 36
```

## Use your own PostgreSQL

Create the role and the database once:

```bash
sudo -u postgres psql -c "CREATE ROLE book_reader LOGIN PASSWORD 'book_reader';" -c "CREATE DATABASE book_reader OWNER book_reader;"
```

Then point your .env at it:

```properties
DB_URL=jdbc:postgresql://localhost:5432/book_reader
```

## Packages

One package per feature, stacked in tiers: each row may lean on the rows above it, never on a
sibling of its own row.

```text
shared                 config, errors, security
settings   conversion  display settings, EPUB to blocks (pure, free of Spring)
book                   the library: reader API and backoffice
catalogue              OPDS search and import, EPUB and catalogue errors
```

Inside a feature, a controller calls a service, and only services touch repositories. Another
feature's data goes through its service, never its repository. A new package gets its row in
`ArchitectureTest`, or the build fails.

## Endpoints worth knowing

```text
http://localhost:8080/readyz                    API and database, the public uptime probe
http://localhost:8080/livez                     the JVM is alive, even without the database
http://localhost:8081/actuator/info             version and build time of what runs
http://localhost:8081/actuator/prometheus       metrics: JVM, HTTP, connection pool
```

## Pitfalls

**Running from the IDE**: the .env is only read by Maven. Add this program argument and run from the
backend folder:

```text
--spring.config.import=optional:file:.env[.properties]
```

**Quotes in .env**: none. Values are read verbatim, quotes included.

**One test class with -Dtest skips the @Nested ones**: run the whole suite.

**Weird compilation errors**: the IDE may leave broken classes in target. Run with clean.

**Never download EPUBs in bulk from ebooksgratuits.com**: the site bans the address after a handful
of files. The tests only talk to a fake server (`mockwebserver3`).
