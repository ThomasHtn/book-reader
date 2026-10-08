package io.github.thomashtn.bookreader.shared.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Problem-details payload (RFC 9457) returned for every API failure, from a controller or a filter.
 *
 * <p>The frontend branches on {@code code} only, never on {@code title} or {@code detail}.</p>
 *
 * @param type      always {@code about:blank}: the status and the code say everything
 * @param title     reason phrase of the status
 * @param status    HTTP status code, repeated for clients that only see the body
 * @param code      stable application error code read by the frontend
 * @param detail    caller-facing explanation, never an internal message
 * @param instance  request path that failed
 * @param timestamp instant the failure was answered
 * @param errors    first validation error of each invalid field, empty otherwise
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
     * Problem type of every response: no dedicated documentation page exists per error.
     */
    private static final URI BLANK_TYPE = URI.create("about:blank");

    /**
     * Copies the field errors so the response stays immutable.
     */
    public ApiErrorResponse {
        errors = Map.copyOf(errors);
    }

    /**
     * Builds a problem response without field errors.
     *
     * @param status    HTTP status, which also gives the title
     * @param code      application error code
     * @param detail    caller-facing explanation
     * @param path      raw request URI that failed
     * @param timestamp instant the failure was answered
     * @return problem response
     */
    public static ApiErrorResponse of(HttpStatus status, String code, String detail, String path, Instant timestamp) {
        return of(status, code, detail, path, timestamp, Map.of());
    }

    /**
     * Builds a problem response.
     *
     * @param status    HTTP status, which also gives the title
     * @param code      application error code
     * @param detail    caller-facing explanation
     * @param path      raw request URI that failed
     * @param timestamp instant the failure was answered
     * @param errors    first validation error of each invalid field
     * @return problem response
     */
    public static ApiErrorResponse of(
        HttpStatus status, String code, String detail, String path, Instant timestamp, Map<String, String> errors
    ) {
        return new ApiErrorResponse(
            BLANK_TYPE, status.getReasonPhrase(), status.value(), code, detail, URI.create(path), timestamp, errors
        );
    }
}
