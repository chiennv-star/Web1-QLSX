# ─────────────────────────────────────────
# Stage 1 — Build (Maven + JDK 25)
# ─────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-25 AS builder

WORKDIR /app

# Cache dependency layer
COPY pom.xml ./
RUN mvn dependency:go-offline -B -q

# Build JAR (skip tests — run tests in CI separately)
COPY src ./src
RUN mvn package -DskipTests -B -q


# ─────────────────────────────────────────
# Stage 2 — Runtime (JRE 25 Jammy)
# ─────────────────────────────────────────
FROM eclipse-temurin:25-jre-jammy AS runner

WORKDIR /app

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
