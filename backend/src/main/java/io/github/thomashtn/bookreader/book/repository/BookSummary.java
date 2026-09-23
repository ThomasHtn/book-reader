package io.github.thomashtn.bookreader.book.repository;

import io.github.thomashtn.bookreader.book.entity.BookSource;
import java.time.Instant;
import java.util.UUID;

/**
 * Book columns without the content, so lists never load the JSONB blocks.
 */
public interface BookSummary {

    /**
     * Returns the identifier.
     *
     * @return identifier
     */
    UUID getId();

    /**
     * Returns the title.
     *
     * @return title
     */
    String getTitle();

    /**
     * Returns the author.
     *
     * @return author
     */
    String getAuthor();

    /**
     * Returns the source.
     *
     * @return source
     */
    BookSource getSource();

    /**
     * Returns the source URL.
     *
     * @return source URL or {@code null}
     */
    String getSourceUrl();

    /**
     * Returns the number of blocks.
     *
     * @return block count
     */
    int getBlockCount();

    /**
     * Returns whether the book is active.
     *
     * @return active flag
     */
    boolean isActive();

    /**
     * Returns the last activation instant.
     *
     * @return activation instant
     */
    Instant getActivatedAt();

    /**
     * Returns the import instant.
     *
     * @return creation instant
     */
    Instant getCreatedAt();

    /**
     * Returns when the book was marked as read from the backoffice.
     *
     * @return marking instant or {@code null}
     */
    Instant getFinishedAt();
}
