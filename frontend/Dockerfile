# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------------
# Quality gates (format, lint, test) run in CI before an image is built, so this stage only builds.
FROM node:22-alpine AS build
WORKDIR /workspace

# Installed before the sources, so this layer only changes with the dependencies.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ------------------------------------------------------------
# nginx serves the bundle; Traefik terminates HTTPS and routes /api/* to the backend on the same origin.
FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
