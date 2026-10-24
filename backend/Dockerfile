# syntax=docker/dockerfile:1

# Base images are pinned by version and digest for reproducible builds; Dependabot bumps both.

# ---- Build stage ------------------------------------------------------------
# Builds the executable jar. Quality gates (Checkstyle, SpotBugs, tests, JaCoCo) already run in CI
# via `./mvnw verify` before an image is ever built here, so this stage only packages the artifact.
FROM eclipse-temurin:25.0.4.1_1-jdk-noble@sha256:ba0f0e1a33864105e1d454e88105c617ab40f71062db1f306bf58be32a3f8e5e AS build
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
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests clean package \
  && cp target/book-reader-*.jar book-reader.jar \
  && java -Djarmode=tools -jar book-reader.jar extract --layers --destination extracted

# ---- Runtime stage ------------------------------------------------------------
FROM eclipse-temurin:25.0.4.1_1-jre-noble@sha256:3f2223fe04b750aa5a8179e29b5c9a1ddf7665fc9bb08bfe11ad01d143bc13a5 AS runtime
WORKDIR /app

# Unprivileged user with a fixed numeric id, so a runtime can check it is not root without a passwd lookup.
RUN groupadd --system --gid 10001 bookreader && useradd --system --uid 10001 --gid 10001 bookreader
USER 10001:10001

# One layer per Spring Boot layer, least to most frequently changed: a code change only ships the last one.
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

# 8080 serves the API and /livez, /readyz; 8081 serves the actuator and must never be routed publicly.
EXPOSE 8080 8081

# Probes the main port, so a stuck API fails even if the management port answers. No curl in this
# image, so bash speaks HTTP over /dev/tcp. The start period covers JVM startup and Flyway migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /readyz HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && read -r status <&3 && [[ $status == *' 200 '* ]]"]

# Heap takes 60 % of the container memory limit; the rest is for metaspace, threads and buffers.
# An OutOfMemoryError exits the JVM, so the restart policy brings back a clean one instead of a half-dead one.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-XX:+ExitOnOutOfMemoryError", "-jar", "book-reader.jar"]
