package io.github.thomashtn.bookreader.catalogue.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.bookreader.catalogue.client.CatalogueRefusedException;
import io.github.thomashtn.bookreader.catalogue.client.CatalogueUnavailableException;
import io.github.thomashtn.bookreader.shared.exception.ApiErrorResponse;
import io.github.thomashtn.bookreader.shared.exception.ApiProblems;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * Specifies how EPUB and catalogue failures are rendered as {@link ApiErrorResponse}.
 */
class CatalogueExceptionHandlerTest {

    /**
     * Instant every response is stamped with.
     */
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    /**
     * Handler under test.
     */
    private final CatalogueExceptionHandler handler =
        new CatalogueExceptionHandler(new ApiProblems(Clock.fixed(NOW, ZoneOffset.UTC)));

    /**
     * Request every failure is reported for.
     */
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/books");

    @Test
    @DisplayName("Renders an unreachable catalogue as 503")
    void rendersCatalogueUnavailable() {
        ResponseEntity<ApiErrorResponse> response = handler.handleCatalogueUnavailable(
            new CatalogueUnavailableException("timeout", new IllegalStateException()), request);

        assertError(response, HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_UNAVAILABLE");
    }

    @Test
    @DisplayName("Renders a download refused by the catalogue as 503 with its own code")
    void rendersCatalogueRefused() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleCatalogueRefused(new CatalogueRefusedException("text/html"), request);

        assertError(response, HttpStatus.SERVICE_UNAVAILABLE, "CATALOGUE_REFUSED");
    }

    /**
     * Checks the status, repeated in the body, and the application code of a problem response.
     *
     * @param response problem response
     * @param status   expected HTTP status
     * @param code     expected application code
     */
    private static void assertError(ResponseEntity<ApiErrorResponse> response, HttpStatus status, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(status.value());
        assertThat(response.getBody().code()).isEqualTo(code);
    }
}
