# Deploying the Liseuse

The Liseuse ships as two Docker images and a short list of requirements. The server brings the rest:
a domain, HTTPS, the secrets and the backups.
This repository holds no production deployment on purpose: each server writes its own compose (or
chart, or PaaS settings) from this page. The root `compose.yaml` is a working example for your machine.

## The images

```bash
docker pull ghcr.io/thomashtn/book-reader-backend:sha-<commit>
docker pull ghcr.io/thomashtn/book-reader-frontend:sha-<commit>
```

Every push to main that passes the tests, the image scan and the browser tests publishes
**sha-&lt;commit&gt;** and moves **main**. A release adds **x.y.z** and **x.y**. Deploy a sha or a
release: a commit that failed its checks has no image, so it cannot reach production.

Both images run as a regular user, carry their own healthcheck and accept a read-only root filesystem
plus a tmpfs on /tmp. Give the backend 1 GB: an EPUB is converted in memory, its heap takes 60 % of the
limit, and it exits cleanly on an OutOfMemoryError so your restart policy brings a fresh one.

## The layout

```text
browser --HTTPS--> your proxy --> frontend :8080 --/api--> backend :8080 --> postgres
                                                           backend :8081  actuator, never routed
```

One rule on your proxy: the domain goes to the frontend on port 8080. nginx serves the app, relays the
API, refuses uploads above 20 MB (the EPUB limit) and answers a JSON 503 while the backend is down, so
the reader shows its status screen.

- The backend and the database stay on the stack's private network.
- Your proxy sets HSTS and may add a rate limit (the reader polls twice every ten seconds). nginx sets
  every other security header, Content-Security-Policy and `X-Robots-Tag: noindex` included.
- A request body limit on the proxy, if any, must allow 20 MB.

## A database of its own

PostgreSQL 17, with a dedicated role and database:

```sql
CREATE ROLE book_reader LOGIN PASSWORD 'change-me';
CREATE DATABASE book_reader OWNER book_reader;
```

Flyway creates the tables on the first start and migrates them on every update. Rolling an image back
after a migration needs the dump taken before it.

## Settings

The backend reads its environment. A Compose .env to start from, kept at mode 600 and never committed:

```properties
# Database
DB_URL=jdbc:postgresql://postgres:5432/book_reader
DB_USERNAME=book_reader
DB_PASSWORD=change-me

# Backoffice key, 32 characters or more: `openssl rand -base64 36`. The backend refuses to start without one.
ADMIN_API_KEY=change-me
```

These already have the right default. Leave them alone unless you know why:

```properties
# Wrong keys allowed per address, then the lockout
ADMIN_RATE_LIMIT_MAX_FAILURES=5
ADMIN_RATE_LIMIT_LOCKOUT_DURATION=PT1M
# Ebooks libres et gratuits site root
CATALOGUE_BASE_URL=https://www.ebooksgratuits.com/
# Swagger maps every administrative route: keep it off
API_DOCS_ENABLED=false
# Never "framework" behind a proxy: a client could pick its own address and dodge the lockout
FORWARD_HEADERS_STRATEGY=native
```

The frontend reads a single setting. Set it when the frontend sits on a network shared with other
apps, where "backend" may well be somebody else's:

```properties
BACKEND_URL=http://book-reader-backend:8080
```

After the first start, open `/admin` and type a wrong key. It should be refused.

## The service worker

The app registers an Angular service worker that only caches its own files (`ngsw-config.json`), never
the API: a start without network shows the reader's status screen rather than the browser's error page.
A new deployment reaches the reader on her next visit, or after ten idle minutes (`AppUpdater`).

## Backups

The database holds the books, their converted text and the display settings. Reading positions live in
the reader's browser. Dump it every night, copy the dumps off the machine, and practise a restore now
and then.

Dump:

```bash
docker compose exec -T postgres pg_dump -U book_reader -d book_reader --format=custom > book-reader-$(date +%F).dump
```

Restore:

```bash
docker compose stop backend
docker compose exec -T postgres pg_restore -U book_reader -d book_reader --clean --if-exists --no-owner < book-reader-<date>.dump
docker compose start backend
```

## Monitoring

Who to ask how things are going (`book-reader-backend` stands for whatever name your stack gives the
backend):

```text
https://<your-domain>/readyz                             API and database: the public uptime probe
https://<your-domain>/healthz                            proxy, TLS and nginx, without the backend
http://book-reader-backend:8080/livez                    the JVM is alive, even without the database
http://book-reader-backend:8081/actuator/health          the same as readyz, from inside the network
http://book-reader-backend:8081/actuator/info            version and build time of what runs
http://book-reader-backend:8081/actuator/prometheus      metrics: JVM, HTTP, connection pool
```

For Prometheus, from a container on the backend's network:

```yaml
scrape_configs:
  - job_name: book-reader
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["book-reader-backend:8081"]
```
