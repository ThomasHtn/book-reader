package io.github.thomashtn.bookreader.shared.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Specifies how failures are rendered as {@link ApiErrorResponse}.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/books/42");

    @Test
    @DisplayName("Renders a missing resource as 404 with the caller-facing message")
    void rendersResourceNotFound() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleResourceNotFound(new ResourceNotFoundException("Book not found."), request);

        assertError(response, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
        assertThat(response.getBody().detail()).isEqualTo("Book not found.");
        assertThat(response.getBody().instance()).hasToString("/api/books/42");
    }

    @Test
    @DisplayName("Renders an invalid request as 400 with the caller-facing message")
    void rendersInvalidRequest() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleInvalidRequest(new InvalidRequestException("The EPUB is encrypted."), request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT");
        assertThat(response.getBody().detail()).isEqualTo("The EPUB is encrypted.");
    }

    @Test
    @DisplayName("Names the parameter of a type mismatch without echoing its value")
    void rendersTypeMismatch() throws NoSuchMethodException {
        MethodParameter parameter = new MethodParameter(String.class.getMethod("charAt", int.class), 0);
        MethodArgumentTypeMismatchException exception =
            new MethodArgumentTypeMismatchException("abc", Integer.class, "page", parameter, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleTypeMismatch(exception, request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT");
        assertThat(response.getBody().detail()).contains("page").doesNotContain("abc");
    }

    @Test
    @DisplayName("Renders an unknown route as 404 rather than a server fault")
    void rendersNoResource() {
        NoResourceFoundException exception = new NoResourceFoundException(HttpMethod.GET, "/api/nope", "api/nope");

        ResponseEntity<ApiErrorResponse> response = handler.handleNoResourceFound(exception, request);

        assertError(response, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    @Test
    @DisplayName("Renders an unsupported method as 405")
    void rendersMethodNotSupported() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("DELETE"), request);

        assertError(response, HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED");
    }

    @Test
    @DisplayName("Hides the internal message of an unexpected failure")
    void hidesUnexpectedFailure() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUnexpectedException(new IllegalStateException("secret internals"), request);

        assertError(response, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");
        assertThat(response.getBody().detail()).doesNotContain("secret");
    }

    private static void assertError(ResponseEntity<ApiErrorResponse> response, HttpStatus status, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(status.value());
        assertThat(response.getBody().code()).isEqualTo(code);
    }
}
