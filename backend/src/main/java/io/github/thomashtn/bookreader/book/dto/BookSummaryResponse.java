package io.github.thomashtn.bookreader.book.dto;

import io.github.thomashtn.bookreader.book.repository.BookSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/**
 * Entry of the reader's book list.
 *
 * @param id          identifier
 * @param title       title
 * @param author      author
 * @param activatedAt last activation, used to order never-opened books
 */
@Schema(description = "Active book in the reader's list.")
public record BookSummaryResponse(UUID id, String title, String author, Instant activatedAt) {

    /**
     * Maps a summary projection.
     *
     * @param summary projection
     * @return response
     */
    public static BookSummaryResponse from(BookSummary summary) {
        return new BookSummaryResponse(
            summary.getId(), summary.getTitle(), summary.getAuthor(), summary.getActivatedAt()
        );
    }
}
