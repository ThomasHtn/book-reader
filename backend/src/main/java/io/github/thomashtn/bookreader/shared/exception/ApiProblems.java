package io.github.thomashtn.bookreader.shared.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Builds the {@link ApiErrorResponse} answers of every exception handler, stamped by the application clock.
 */
@Component
public class ApiProblems {

    /**
     * Clock stamping each problem response.
     */
    private final Clock clock;

    /**
     * Creates the builder.
     *
     * @param clock application clock
     */
    public ApiProblems(Clock clock) {
        this.clock = clock;
    }

    /**
     * Builds a problem response without field errors.
     *
     * @param status  HTTP status
     * @param code    application error code
     * @param detail  caller-facing explanation
     * @param request current HTTP request
     * @return response carrying the problem
     */
    public ResponseEntity<ApiErrorResponse> of(
        HttpStatus status, String code, String detail, HttpServletRequest request
    ) {
        return of(status, code, detail, request, Map.of());
    }

    /**
     * Builds a problem response.
     *
     * @param status  HTTP status
     * @param code    application error code
     * @param detail  caller-facing explanation
     * @param request current HTTP request
     * @param errors  first validation error of each invalid field
     * @return response carrying the problem
     */
    public ResponseEntity<ApiErrorResponse> of(
        HttpStatus status, String code, String detail, HttpServletRequest request, Map<String, String> errors
    ) {
        ApiErrorResponse body =
            ApiErrorResponse.of(status, code, detail, request.getRequestURI(), clock.instant(), errors);
        return ResponseEntity.status(status).body(body);
    }
}
