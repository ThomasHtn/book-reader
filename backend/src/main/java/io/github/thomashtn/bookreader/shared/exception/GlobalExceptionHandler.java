package io.github.thomashtn.bookreader.shared.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Converts exceptions into {@link ApiErrorResponse} problem payloads.
 *
 * <p>Every caller mistake gets its own 4xx handler; anything else reaches the catch-all, is logged
 * and answered with a generic 500 that never echoes an internal message. A feature renders its own
 * failures in its own advice; this one runs last, so its catch-all never shadows them.</p>
 *
 * <p>The {@code code} values are a contract with the backoffice, which maps them to French messages
 * in {@code frontend/src/app/core/admin/admin-message.ts}: change one on both sides or not at all.</p>
 */
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
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
     * Builder of the problem responses.
     */
    private final ApiProblems problems;

    /**
     * Creates the handler.
     *
     * @param problems builder of the problem responses
     */
    public GlobalExceptionHandler(ApiProblems problems) {
        this.problems = problems;
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
        return problems.of(HttpStatus.NOT_FOUND, RESOURCE_NOT_FOUND, exception.getMessage(), request);
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
        return problems.of(
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
        return problems.of(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, exception.getMessage(), request);
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
        return problems.of(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
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
        return problems.of(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", detail, request);
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
        return problems.of(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
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
        return problems.of(HttpStatus.BAD_REQUEST, INVALID_ARGUMENT, detail, request);
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
        return problems.of(HttpStatus.NOT_FOUND, RESOURCE_NOT_FOUND, detail, request);
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
        return problems.of(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", detail, request);
    }

    /**
     * Handles a body type the route does not read, such as JSON sent to the EPUB upload.
     *
     * @param exception exception raised for an unsupported content type
     * @param request   current HTTP request
     * @return 415 response
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(
        HttpMediaTypeNotSupportedException exception, HttpServletRequest request
    ) {
        String detail = "The request body type is not supported by this resource.";
        return problems.of(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", detail, request);
    }

    /**
     * Handles any exception without a more specific handler: a caller mistake Spring raised keeps its 4xx,
     * anything else is a logged 500.
     *
     * @param exception unexpected exception, logged with its stack trace
     * @param request   current HTTP request
     * @return 4xx response for a caller mistake, 500 otherwise
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception, HttpServletRequest request) {
        // Spring already knows the 4xx of the caller mistakes it raises (406, a missing header...).
        if (exception instanceof ErrorResponse spring && spring.getStatusCode().is4xxClientError()) {
            HttpStatus status = HttpStatus.valueOf(spring.getStatusCode().value());
            return problems.of(status, status.name(), "The request cannot be served as sent.", request);
        }
        LOGGER.error("Unexpected error while processing {} {}",
            request.getMethod(), request.getRequestURI(), exception);
        String detail = "An unexpected error occurred.";
        return problems.of(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", detail, request);
    }
}
