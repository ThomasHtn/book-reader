package io.github.thomashtn.bookreader.book.controller;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.shared.exception.ApiErrorResponse;
import io.github.thomashtn.bookreader.shared.exception.ApiProblems;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Renders the EPUB failures, whether raised by an upload or by a catalogue import.
 *
 * <p>It runs before {@code GlobalExceptionHandler}, whose catch-all would otherwise answer 500.</p>
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class BookExceptionHandler {

    /**
     * Application logger.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(BookExceptionHandler.class);

    /**
     * Builder of the problem responses.
     */
    private final ApiProblems problems;

    /**
     * Upload limit quoted by the 413, which is the EPUB size limit.
     */
    private final DataSize maxUploadSize;

    /**
     * Creates the handler.
     *
     * @param problems      builder of the problem responses
     * @param maxUploadSize multipart file limit from {@code spring.servlet.multipart.max-file-size}
     */
    public BookExceptionHandler(
        ApiProblems problems, @Value("${spring.servlet.multipart.max-file-size}") DataSize maxUploadSize
    ) {
        this.problems = problems;
        this.maxUploadSize = maxUploadSize;
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
        String detail = "The file exceeds " + maxUploadSize.toMegabytes() + " MB.";
        return problems.of(HttpStatus.CONTENT_TOO_LARGE, Reason.TOO_LARGE.code(), detail, request);
    }
}
