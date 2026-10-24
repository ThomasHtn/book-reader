package io.github.thomashtn.bookreader.catalogue.controller;

import io.github.thomashtn.bookreader.catalogue.client.CatalogueRefusedException;
import io.github.thomashtn.bookreader.catalogue.client.CatalogueUnavailableException;
import io.github.thomashtn.bookreader.catalogue.config.CatalogueProperties;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.shared.exception.ApiErrorResponse;
import io.github.thomashtn.bookreader.shared.exception.ApiProblems;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Renders the EPUB and catalogue failures, whether raised by an upload or by a catalogue import.
 *
 * <p>It sits in the catalogue, the only feature that sees both the conversion and the EPUB size limit.
 * It runs before {@code GlobalExceptionHandler}, whose catch-all would otherwise answer 500.</p>
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CatalogueExceptionHandler {

    /**
     * Application logger.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(CatalogueExceptionHandler.class);

    /**
     * Builder of the problem responses.
     */
    private final ApiProblems problems;

    /**
     * Largest EPUB accepted, also the upload limit quoted by the 413.
     */
    private final DataSize maxEpubSize;

    /**
     * Creates the handler.
     *
     * @param problems            builder of the problem responses
     * @param catalogueProperties catalogue settings holding the EPUB size limit
     */
    public CatalogueExceptionHandler(ApiProblems problems, CatalogueProperties catalogueProperties) {
        this.problems = problems;
        this.maxEpubSize = catalogueProperties.maxEpubSize();
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
        return problems.of(HttpStatus.UNPROCESSABLE_CONTENT, exception.reason().code(), detail, request);
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
        String detail = "The file exceeds " + maxEpubSize.toMegabytes() + " MB.";
        return problems.of(HttpStatus.CONTENT_TOO_LARGE, Reason.TOO_LARGE.code(), detail, request);
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
        return problems.of(HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_UNAVAILABLE", detail, request);
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
        return problems.of(HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_REFUSED", detail, request);
    }
}
