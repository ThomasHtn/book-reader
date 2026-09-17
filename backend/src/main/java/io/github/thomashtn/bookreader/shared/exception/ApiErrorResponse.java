package io.github.thomashtn.bookreader.shared.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.net.URI;
import java.time.Instant;
import java.util.Map;

/**
 * Represents the problem-details payload returned for API failures.
 */
@Schema(description = "Standard API problem response.")
public record ApiErrorResponse(

    URI type,
    String title,
    int status,
    String code,
    String detail,
    URI instance,
    Instant timestamp,
    Map<String, String> errors
) {
    /**
     * Creates an immutable API error response.
     */
    public ApiErrorResponse {
        errors = Map.copyOf(errors);
    }

}
