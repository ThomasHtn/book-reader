package io.github.thomashtn.bookreader.book.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
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
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Specifies how EPUB failures are rendered as {@link ApiErrorResponse}.
 */
class BookExceptionHandlerTest {

    /**
     * Instant every response is stamped with.
     */
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    /**
     * Handler under test, with the production upload limit.
     */
    private final BookExceptionHandler handler =
        new BookExceptionHandler(new ApiProblems(Clock.fixed(NOW, ZoneOffset.UTC)), DataSize.ofMegabytes(20));

    /**
     * Request every failure is reported for.
     */
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/books");

    @Test
    @DisplayName("Renders a refused EPUB as 422 with a code per reason")
    void rendersEpubRejection() {
        ResponseEntity<ApiErrorResponse> response = handler.handleEpubRejected(
            new EpubRejectedException(Reason.NO_TEXT, "internal detail"), request);

        assertError(response, HttpStatus.UNPROCESSABLE_CONTENT, "EPUB_NO_TEXT");
        assertThat(response.getBody().detail()).doesNotContain("internal");
    }

    @Test
    @DisplayName("Renders an upload above 20 MB as 413 with the too-large EPUB code")
    void rendersUploadTooLarge() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUploadTooLarge(new MaxUploadSizeExceededException(20L * 1024 * 1024), request);

        assertError(response, HttpStatus.CONTENT_TOO_LARGE, "EPUB_TOO_LARGE");
        assertThat(response.getBody().detail()).isEqualTo("The file exceeds 20 MB.");
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
