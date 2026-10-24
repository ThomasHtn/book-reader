package io.github.thomashtn.bookreader.shared.security;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.bookreader.shared.config.ApplicationProperties;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Stateless HTTP security rules; the app is served from one origin, so no CORS is configured.
 *
 * <p>Every {@code GET /api/**} is public and anything else is denied unless a rule allows it.
 * Administrative routes are authenticated by {@link AdminApiKeyFilter}, which reports <em>why</em> a
 * key was refused, and authorized here, which decides <em>whether</em> a request proceeds; both use
 * {@link AdminApiKeyFilter#ADMIN_PATH_PATTERN}. The OpenAPI document stays off by default: it maps
 * every administrative route, payload and error code.</p>
 */
@Configuration
public class SecurityConfig {

    /**
     * Creates the in-memory lockout shared by every administrative request.
     *
     * @param properties application settings holding the failure budget
     * @param clock      application clock
     * @return rate limiter
     */
    @Bean
    AdminAuthRateLimiter adminAuthRateLimiter(ApplicationProperties properties, Clock clock) {
        return new AdminAuthRateLimiter(properties.adminRateLimit(), clock);
    }

    /**
     * Builds the application security filter chain.
     *
     * @param http                 Spring Security HTTP configuration
     * @param properties           application-level configuration properties
     * @param adminAuthRateLimiter throttle applied to repeated invalid admin-key attempts
     * @param objectMapper         application JSON mapper, so refusals match the controllers' errors
     * @param clock                application clock stamping refusals
     * @return the configured security filter chain
     * @throws Exception when Spring Security cannot build the chain
     */
    @Bean
    @SuppressFBWarnings(
        value = "THROWS_METHOD_THROWS_CLAUSE_BASIC_EXCEPTION",
        justification = """
            Spring Security's HttpSecurity configuration and build API declares
            Exception. Narrowing the checked exception is not possible without
            wrapping framework exceptions and losing their original semantics.
            """
    )
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        ApplicationProperties properties,
        AdminAuthRateLimiter adminAuthRateLimiter,
        ObjectMapper objectMapper,
        Clock clock
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            // Cache-Control is set by HttpCachingConfig: no-store here would defeat ETag revalidation.
            .headers(headers -> headers.cacheControl(cache -> cache.disable()))
            .sessionManagement(session -> session.sessionCreationPolicy(
                SessionCreationPolicy.STATELESS
            ))
            .authorizeHttpRequests(authorize -> {
                authorize
                    // Must stay ahead of the public GET rule below, which would otherwise open
                    // every administrative read endpoint.
                    .requestMatchers(AdminApiKeyFilter.ADMIN_PATH_PATTERN)
                    .hasAuthority(AdminApiKeyFilter.ADMIN_ROLE)
                    // Open to probes: /livez and /readyz only tell up or down; the actuator lives on the
                    // management port, which no proxy routes.
                    .requestMatchers(
                        "/livez", "/readyz",
                        "/actuator/health", "/actuator/health/**", "/actuator/info", "/actuator/prometheus"
                    ).permitAll();

                // Same flag as springdoc, so the exception disappears with the routes it opens.
                if (properties.apiDocsEnabled()) {
                    authorize.requestMatchers(
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/api-docs",
                        "/api-docs/**"
                    ).permitAll();
                }

                authorize
                    .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                    .anyRequest().denyAll();
            })
            .addFilterBefore(
                new AdminApiKeyFilter(properties.adminApiKey(), adminAuthRateLimiter, objectMapper, clock),
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
