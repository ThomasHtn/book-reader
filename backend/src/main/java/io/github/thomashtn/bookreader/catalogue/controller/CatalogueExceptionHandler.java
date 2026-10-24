package io.github.thomashtn.bookreader.catalogue.controller;

import io.github.thomashtn.bookreader.catalogue.client.CatalogueRefusedException;
import io.github.thomashtn.bookreader.catalogue.client.CatalogueUnavailableException;
import io.github.thomashtn.bookreader.shared.exception.ApiErrorResponse;
import io.github.thomashtn.bookreader.shared.exception.ApiProblems;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Renders the failures of the catalogue site.
 *
 * <p>It runs before {@code GlobalExceptionHandler}, whose catch-all would otherwise answer 500.</p>
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
     * Creates the handler.
     *
     * @param problems builder of the problem responses
     */
    public CatalogueExceptionHandler(ApiProblems problems) {
        this.problems = problems;
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
