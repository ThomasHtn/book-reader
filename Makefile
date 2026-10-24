# Entry point for both halves of the app and its images; `make` alone lists the targets.
# Each target only wraps the documented command (CONTRIBUTING.md), so nothing here is required to work.

.DEFAULT_GOAL := help
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: help setup db backend frontend dev fix lint test verify e2e up down reset logs key version

##@ Setup

help: ## List the targets
	@awk 'BEGIN { FS = ":.*## " } /^##@/ { printf "\n%s\n", substr($$0, 5) } /^[a-z0-9-]+:.*## / { printf "  %-10s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## First run: local settings (demo administrator key) and frontend dependencies
	test -f backend/.env || cp backend/.env.example backend/.env
	cd frontend && npx --yes npm@11 install

##@ Development

db: ## Development PostgreSQL on localhost:5433, kept between runs
	docker compose up --detach --wait postgres

backend: ## API on :8080, actuator on :8081
	cd backend && ./mvnw spring-boot:run

frontend: ## App on :4200, proxying /api to :8080
	cd frontend && npm start

dev: db ## Database, API and app together; Ctrl+C stops both
	$(MAKE) --no-print-directory -j2 backend frontend

##@ Quality

fix: ## Every auto-fix: ESLint, Stylelint, Prettier, Spotless
	cd frontend && npm run fix
	cd backend && ./mvnw --batch-mode --quiet spotless:apply

lint: ## Linters and format checks, without the tests
	cd frontend && npm run format:check && npm run lint
	cd backend && ./mvnw --batch-mode --no-transfer-progress spotless:check checkstyle:check

test: ## Unit and integration tests of both halves (Docker for the backend)
	cd frontend && npm test -- --watch=false
	cd backend && ./mvnw --batch-mode --no-transfer-progress test

verify: ## Every CI gate: format, lint, tests, coverage, SpotBugs, architecture, production bundle
	cd frontend && npm run format:check && npm run lint && npm run test:ci && npm run build
	cd backend && ./mvnw --batch-mode --no-transfer-progress clean verify

e2e: ## Reader journey against http://localhost:8000 (`make reset up` first: it needs an empty library)
	cd frontend && npm run e2e

##@ Images

up: ## Whole app from its images on http://localhost:8000, in the background
	docker compose up --build --detach --wait

down: ## Stop it, keeping the database
	docker compose down

reset: ## Stop it and drop its database, the development one included
	docker compose down --volumes

logs: ## Follow the logs of every container
	docker compose logs --follow

##@ Deployment and release

key: ## A random administrator key, for ADMIN_API_KEY
	@openssl rand -base64 36

version: ## Set the version of both halves before tagging: make version VERSION=1.1.0
	@if [[ ! "$(VERSION)" =~ ^[0-9]+\.[0-9]+\.[0-9]+$$ ]]; then echo 'Usage: make version VERSION=x.y.z' >&2; exit 1; fi
	cd backend && ./mvnw --batch-mode --quiet versions:set -DnewVersion=$(VERSION) -DgenerateBackupPoms=false
	cd frontend && npm version $(VERSION) --no-git-tag-version
	@echo 'Commit, then tag: git tag v$(VERSION) && git push origin v$(VERSION)'
