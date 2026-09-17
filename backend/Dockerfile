# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------------
# Builds the executable jar. Quality gates (Checkstyle, SpotBugs, tests, JaCoCo) already run in CI
# via `./mvnw verify` before an image is ever built here, so this stage only packages the artifact.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

# Copied and resolved before the source tree, so this layer is only invalidated when a dependency
# actually changes rather than on every code change.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress dependency:go-offline

# Checkstyle (bound to the `validate` phase, still run below despite -DskipTests) reads its config
# from here.
COPY config config
COPY src src
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests clean package

# ---- Runtime stage ------------------------------------------------------------
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# Runs as an unprivileged user rather than the image's default root.
RUN groupadd --system bookreader && useradd --system --gid bookreader bookreader
USER bookreader

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

# Health: http://localhost:8080/actuator/health (see backend/CLAUDE.md). No HTTP client is bundled
# here for a HEALTHCHECK instruction — orchestrators typically probe this endpoint themselves
# (Kubernetes liveness/readiness probes, Docker Compose `healthcheck` with an external prober, etc.).
ENTRYPOINT ["java", "-jar", "app.jar"]
