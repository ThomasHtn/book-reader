package io.github.thomashtn.bookreader.shared.exception;

import io.github.thomashtn.bookreader.catalogue.client.CatalogueRefusedException;
import io.github.thomashtn.bookreader.catalogue.client.CatalogueUnavailableException;
import io.github.thomashtn.bookreader.catalogue.config.CatalogueProperties;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Converts exceptions into {@link ApiErrorResponse} problem payloads.
 *
 * <p>Every caller mistake gets its own 4xx handler; anything else reaches the catch-all, is logged
 * and answered with a generic 500 that never echoes an internal message.</p>
 *
 * <p>The {@code code} values are a contract with the backoffice, which maps them to French messages
 * in {@code frontend/src/app/core/admin/admin-errors.ts}: change one on both sides or not at all.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Application logger.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Code of a request value the API cannot accept.
     */
    private static final String INVALID_ARGUMENT = "INVALID_ARGUMENT";

    /**
     * Code of an unknown resource, whether an entity or a route.
     */
    private static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";

    /**
     * Clock stamping each problem response.
     */
    private final Clock clock;

    /**
     * Catalogue settings, whose EPUB size limit is also the upload limit quoted by the 413.
     */
    private final CatalogueProperties catalogueProperties;

    /**
     * Creates the handler.
     *
     * @param clock               application clock
     * @param catalogueProperties catalogue settings holding the EPUB size limit
     */
    public GlobalExceptionHandler(Clock clock, CatalogueProperties catalogueProperties) {
        this.clock = clock;
        this.catalogueProperties = catalogueProperties;
    }

    /**
     * Handles an unknown application resource.
     *
     * @param exception not-found exception, whose message is written for the caller
     * @param request   current HTTP request
     * @return 404 response
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleResourceNotFound(
        ResourceNotFoundException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.NOT_FOUND, RESOURCE_NOT_FOUND, exception.getMessage(), request);
    }

    /**
     * Handles bean validation failures, listing the first error of each field.
     *
     * @param exception validation exception
     * @param request   current HTTP request
     * @return 400 response with field errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleValidationFailure(
        MethodArgumentNotValidException exception, HttpServletRequest request
    ) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
            .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return problem(
            HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "One or more fields are invalid.", request, errors
        );
    }

    /**
     * Handles a request value rejected by the application.
     *
     * @param exception invalid-request exception, whose message is written for the caller
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(InvalidRequestException.class)
    ResponseEntity<ApiErrorResponse> handleInvalidRequest(
        InvalidRequestException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, exception.getMessage(), request);
    }

    /**
     * Handles a parameter that cannot be converted to its type; the raw value is not echoed back.
     *
     * @param exception type-mismatch exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException exception, HttpServletRequest request
    ) {
        String detail = "Parameter '" + exception.getName() + "' has an invalid value.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
    }

    /**
     * Handles a body that cannot be read, such as malformed JSON or an unknown enum value.
     *
     * @param exception unreadable-body exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleUnreadableBody(
        HttpMessageNotReadableException exception, HttpServletRequest request
    ) {
        String detail = "The request body is malformed or holds an unsupported value.";
        return problem(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", detail, request);
    }

    /**
     * Handles an EPUB the reader cannot use, answering with the code of its {@link Reason}.
     *
     * @param exception rejection with its reason
     * @param request   current HTTP request
     * @return 422 response
     */
    @ExceptionHandler(EpubRejectedException.class)
    ResponseEntity<ApiErrorResponse> handleEpubRejected(
        EpubRejectedException exception, HttpServletRequest request
    ) {
        LOGGER.info("EPUB rejected ({}): {}", exception.reason(), exception.getMessage());
        String detail = "The EPUB cannot be converted.";
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, exception.reason().code(), detail, request);
    }

    /**
     * Handles an upload above the multipart limit, which is the configured EPUB size limit.
     *
     * @param exception exception raised by the multipart resolver
     * @param request   current HTTP request
     * @return 413 response
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiErrorResponse> handleUploadTooLarge(
        MaxUploadSizeExceededException exception, HttpServletRequest request
    ) {
        String detail = "The file exceeds " + catalogueProperties.maxEpubSize().toMegabytes() + " MB.";
        return problem(HttpStatus.CONTENT_TOO_LARGE, Reason.TOO_LARGE.code(), detail, request);
    }

    /**
     * Handles a multipart request without its expected part.
     *
     * @param exception missing-part exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ApiErrorResponse> handleMissingPart(
        MissingServletRequestPartException exception, HttpServletRequest request
    ) {
        String detail = "Part '" + exception.getRequestPartName() + "' is required.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
    }

    /**
     * Handles a missing required query parameter.
     *
     * @param exception missing-parameter exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiErrorResponse> handleMissingParameter(
        MissingServletRequestParameterException exception, HttpServletRequest request
    ) {
        String detail = "Parameter '" + exception.getParameterName() + "' is required.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
    }

    /**
     * Handles a catalogue site that did not answer, so the backoffice can offer to retry.
     *
     * @param exception unavailability with its cause
     * @param request   current HTTP request
     * @return 503 response
     */
    @ExceptionHandler(CatalogueUnavailableException.class)
    ResponseEntity<ApiErrorResponse> handleCatalogueUnavailable(
        CatalogueUnavailableException exception, HttpServletRequest request
    ) {
        LOGGER.warn("Catalogue unavailable while processing {} {}: {}",
            request.getMethod(), request.getRequestURI(), exception.getMessage());
        String detail = "The catalogue site cannot be reached.";
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_UNAVAILABLE", detail, request);
    }

    /**
     * Handles a download the catalogue refused, typically after banning the server address for a while.
     *
     * @param exception refusal with the content type received
     * @param request   current HTTP request
     * @return 503 response
     */
    @ExceptionHandler(CatalogueRefusedException.class)
    ResponseEntity<ApiErrorResponse> handleCatalogueRefused(
        CatalogueRefusedException exception, HttpServletRequest request
    ) {
        LOGGER.warn("Catalogue refused a download: {}", exception.getMessage());
        String detail = "The catalogue refuses downloads for now.";
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_REFUSED", detail, request);
    }

    /**
     * Handles a path this API does not expose.
     *
     * @param exception exception raised for an unmapped path
     * @param request   current HTTP request
     * @return 404 response
     */
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNoResourceFound(
        NoResourceFoundException exception, HttpServletRequest request
    ) {
        String detail = "The requested resource does not exist.";
        return problem(HttpStatus.NOT_FOUND, RESOURCE_NOT_FOUND, detail, request);
    }

    /**
     * Handles an HTTP method the matched route does not accept.
     *
     * @param exception exception raised for an unsupported method
     * @param request   current HTTP request
     * @return 405 response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
        HttpRequestMethodNotSupportedException exception, HttpServletRequest request
    ) {
        String detail = "The " + request.getMethod() + " method is not supported by this resource.";
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", detail, request);
    }

    /**
     * Handles any exception without a more specific handler.
     *
     * @param exception unexpected exception, logged with its stack trace
     * @param request   current HTTP request
     * @return 500 response
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception, HttpServletRequest request) {
        LOGGER.error("Unexpected error while processing {} {}",
            request.getMethod(), request.getRequestURI(), exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred.", request);
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
    private ResponseEntity<ApiErrorResponse> problem(
        HttpStatus status, String code, String detail, HttpServletRequest request
    ) {
        return problem(status, code, detail, request, Map.of());
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
    private ResponseEntity<ApiErrorResponse> problem(
        HttpStatus status, String code, String detail, HttpServletRequest request, Map<String, String> errors
    ) {
        ApiErrorResponse body =
            ApiErrorResponse.of(status, code, detail, request.getRequestURI(), clock.instant(), errors);
        return ResponseEntity.status(status).body(body);
    }
}
