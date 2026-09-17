package io.github.thomashtn.bookreader.shared.exception;

import io.github.thomashtn.bookreader.catalogue.client.CatalogueUnavailableException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
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
 * Converts application exceptions into consistent HTTP problem responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Logger used to report operational and diagnostic information.
     */
    private static final Logger LOGGER =
        LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles requests targeting an unknown application resource.
     *
     * @param exception raised resource-not-found exception
     * @param request current HTTP request
     * @return standardized HTTP 404 response
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleResourceNotFound(
        ResourceNotFoundException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND",
            exception.getMessage(),
            request,
            Map.of()
        );
    }

    /**
     * Handles validation failures produced while binding request data.
     *
     * @param exception validation exception containing field errors
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleValidationFailure(
        MethodArgumentNotValidException exception,
        HttpServletRequest request
    ) {
        Map<String, String> errors = new LinkedHashMap<>();

        exception.getBindingResult()
            .getFieldErrors()
            .forEach(fieldError -> errors.putIfAbsent(
                fieldError.getField(),
                fieldError.getDefaultMessage()
            ));

        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_FAILED",
            "One or more fields are invalid.",
            request,
            errors
        );
    }

    /**
     * Handles a request value the API rejects.
     *
     * <p>Only this exception yields a 400 carrying its own message. A bare
     * {@link IllegalArgumentException} means an internal expectation broke, not that the caller
     * erred, so it falls through to the catch-all below and is reported as a server fault instead
     * of blaming the caller and echoing an internal message back.
     *
     * @param exception invalid-request exception
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(InvalidRequestException.class)
    ResponseEntity<ApiErrorResponse> handleInvalidRequest(
        InvalidRequestException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_ARGUMENT",
            exception.getMessage(),
            request,
            Map.of()
        );
    }

    /**
     * Handles a request parameter that cannot be converted to its declared type.
     *
     * <p>Without this handler {@code ?page=abc} reaches the catch-all and answers 500, telling
     * the caller the server broke over a value it typed itself. The offending parameter is named,
     * but the raw value is not echoed back.
     *
     * @param exception type-mismatch exception raised during argument binding
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_ARGUMENT",
            "Parameter '" + exception.getName() + "' has an invalid value.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a request body that cannot be read, such as malformed JSON or an unknown enum value.
     *
     * @param exception exception raised while reading the body
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleUnreadableBody(
        HttpMessageNotReadableException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "MALFORMED_REQUEST",
            "The request body is malformed or holds an unsupported value.",
            request,
            Map.of()
        );
    }

    /**
     * Handles an EPUB the reader cannot use; the backoffice turns the code into a message.
     *
     * @param exception rejection with its reason
     * @param request current HTTP request
     * @return standardized HTTP 422 response with code {@code EPUB_<REASON>}
     */
    @ExceptionHandler(EpubRejectedException.class)
    ResponseEntity<ApiErrorResponse> handleEpubRejected(
        EpubRejectedException exception,
        HttpServletRequest request
    ) {
        LOGGER.info("EPUB rejected ({}): {}", exception.reason(), exception.getMessage());
        return buildResponse(
            HttpStatus.UNPROCESSABLE_CONTENT,
            "EPUB_" + exception.reason().name(),
            "The EPUB cannot be converted.",
            request,
            Map.of()
        );
    }

    /**
     * Handles an upload above the multipart limit.
     *
     * @param exception exception raised by the multipart resolver
     * @param request current HTTP request
     * @return standardized HTTP 413 response
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiErrorResponse> handleUploadTooLarge(
        MaxUploadSizeExceededException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.CONTENT_TOO_LARGE,
            "EPUB_TOO_LARGE",
            "The file exceeds 20 MB.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a multipart request without its expected part.
     *
     * @param exception missing part exception
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ApiErrorResponse> handleMissingPart(
        MissingServletRequestPartException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_ARGUMENT",
            "Part '" + exception.getRequestPartName() + "' is required.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a catalogue site that did not answer, so the backoffice can offer to retry.
     *
     * @param exception unavailability with its cause
     * @param request current HTTP request
     * @return standardized HTTP 503 response
     */
    @ExceptionHandler(CatalogueUnavailableException.class)
    ResponseEntity<ApiErrorResponse> handleCatalogueUnavailable(
        CatalogueUnavailableException exception,
        HttpServletRequest request
    ) {
        LOGGER.warn("Catalogue unavailable while processing {} {}: {}",
            request.getMethod(), request.getRequestURI(), exception.getMessage());
        return buildResponse(
            HttpStatus.SERVICE_UNAVAILABLE,
            "CATALOGUE_UNAVAILABLE",
            "The catalogue site cannot be reached.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a missing required query parameter.
     *
     * @param exception missing parameter exception
     * @param request current HTTP request
     * @return standardized HTTP 400 response
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiErrorResponse> handleMissingParameter(
        MissingServletRequestParameterException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.BAD_REQUEST,
            "INVALID_ARGUMENT",
            "Parameter '" + exception.getParameterName() + "' is required.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a request addressed to a route this API does not expose.
     *
     * <p>Without this handler an unknown path falls through to the catch-all below and is reported
     * as an internal error, telling a caller the server broke when it merely asked for something
     * that does not exist.
     *
     * @param exception exception raised for an unmapped path
     * @param request current HTTP request
     * @return standardized HTTP 404 response
     */
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNoResourceFound(
        NoResourceFoundException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND",
            "The requested resource does not exist.",
            request,
            Map.of()
        );
    }

    /**
     * Handles a request whose HTTP method the matched route does not accept.
     *
     * <p>Without this handler the request falls through to the catch-all below and is reported as an
     * internal error, blaming the server for a caller mistake.
     *
     * @param exception exception raised for an unsupported HTTP method
     * @param request current HTTP request
     * @return standardized HTTP 405 response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
        HttpRequestMethodNotSupportedException exception,
        HttpServletRequest request
    ) {
        return buildResponse(
            HttpStatus.METHOD_NOT_ALLOWED,
            "METHOD_NOT_ALLOWED",
            "The " + request.getMethod() + " method is not supported by this resource.",
            request,
            Map.of()
        );
    }

    /**
     * Handles unexpected exceptions not covered by a more specific handler.
     *
     * @param exception unexpected exception
     * @param request current HTTP request
     * @return a standardized HTTP 500 response
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpectedException(
        Exception exception,
        HttpServletRequest request
    ) {
        LOGGER.error(
            "Unexpected error while processing {} {}",
            request.getMethod(),
            request.getRequestURI(),
            exception
        );

        return buildResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            request,
            Map.of()
        );
    }

    /**
     * Builds the common API error payload returned by exception handlers.
     *
     * @param status HTTP status
     * @param code application-specific error code
     * @param detail human-readable error detail
     * @param request current HTTP request
     * @param errors optional validation errors indexed by field name
     * @return complete error response entity
     */
    private ResponseEntity<ApiErrorResponse> buildResponse(
        HttpStatus status,
        String code,
        String detail,
        HttpServletRequest request,
        Map<String, String> errors
    ) {
        ApiErrorResponse body = new ApiErrorResponse(
            URI.create("about:blank"),
            status.getReasonPhrase(),
            status.value(),
            code,
            detail,
            URI.create(request.getRequestURI()),
            Instant.now(),
            errors
        );

        return ResponseEntity.status(status).body(body);
    }
}
