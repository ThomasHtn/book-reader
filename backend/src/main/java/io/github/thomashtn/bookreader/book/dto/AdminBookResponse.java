package io.github.thomashtn.bookreader.book.dto;

import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.book.entity.BookSource;
import io.github.thomashtn.bookreader.book.repository.BookSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/**
 * A book as the backoffice library shows it.
 *
 * @param id          identifier
 * @param title       title
 * @param author      author
 * @param source      catalogue or upload
 * @param sourceUrl   catalogue entry URL, {@code null} for an upload
 * @param active      whether the reader sees it
 * @param blockCount  number of blocks
 * @param activatedAt last activation
 * @param createdAt   import instant
 * @param finishedAt  when marked as read from the backoffice, {@code null} otherwise
 */
@Schema(description = "Imported book, active or withdrawn.")
public record AdminBookResponse(
    UUID id,
    String title,
    String author,
    BookSource source,
    String sourceUrl,
    boolean active,
    int blockCount,
    Instant activatedAt,
    Instant createdAt,
    Instant finishedAt
) {

    /**
     * Maps a summary projection.
     *
     * @param book projection
     * @return response
     */
    public static AdminBookResponse from(BookSummary book) {
        return new AdminBookResponse(book.getId(), book.getTitle(), book.getAuthor(), book.getSource(),
            book.getSourceUrl(), book.isActive(), book.getBlockCount(), book.getActivatedAt(), book.getCreatedAt(),
            book.getFinishedAt());
    }

    /**
     * Maps the entity.
     *
     * @param book entity
     * @return response
     */
    public static AdminBookResponse from(Book book) {
        return new AdminBookResponse(book.getId(), book.getTitle(), book.getAuthor(), book.getSource(),
            book.getSourceUrl(), book.isActive(), book.getBlockCount(), book.getActivatedAt(), book.getCreatedAt(),
            book.getFinishedAt());
    }
}
