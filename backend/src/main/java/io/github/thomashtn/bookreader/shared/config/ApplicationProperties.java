package io.github.thomashtn.bookreader.shared.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Application settings under {@code app.*}, validated at startup so a bad value stops the boot.
 *
 * @param frontendOrigin Angular frontend origin allowed by CORS
 * @param adminApiKey    secret protecting administrative endpoints, at least 32 characters
 * @param apiDocsEnabled whether the OpenAPI document and Swagger UI are served and reachable
 * @param adminRateLimit lockout applied to repeated wrong administrator keys
 */
@Validated
@ConfigurationProperties("app")
public record ApplicationProperties(
    @NotBlank String frontendOrigin,
    @NotBlank @Size(min = 32) String adminApiKey,
    boolean apiDocsEnabled,
    @Valid @NotNull AdminRateLimit adminRateLimit
) {

    /**
     * Lockout applied to an address sending wrong administrator keys ({@code app.admin-rate-limit.*}).
     *
     * @param maxFailures     wrong keys allowed before the address is locked out
     * @param lockoutDuration how long the address stays locked out, also the window after which its
     *                        failure count resets
     */
    public record AdminRateLimit(@Positive int maxFailures, @NotNull Duration lockoutDuration) {
    }
}
