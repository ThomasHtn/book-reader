package io.github.thomashtn.bookreader.book.entity;

import io.github.thomashtn.bookreader.conversion.model.Block;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * An imported book and its content in the internal format.
 */
@Entity
@Table(name = "book")
public class Book {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String author;

    @Convert(converter = BookSourceConverter.class)
    @Column(nullable = false)
    private BookSource source;

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "source_url")
    private String sourceUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<Block> content;

    @Column(name = "block_count", nullable = false)
    private int blockCount;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "activated_at", nullable = false)
    private Instant activatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    /**
     * Constructor required by JPA.
     */
    protected Book() {
    }

    private Book(ConvertedBook converted, BookSource source, String sourceId, String sourceUrl, Instant now) {
        this.id = UUID.randomUUID();
        this.title = converted.title();
        this.author = converted.author();
        this.source = source;
        this.sourceId = sourceId;
        this.sourceUrl = sourceUrl;
        this.content = converted.blocks();
        this.blockCount = converted.blocks().size();
        this.active = true;
        this.activatedAt = now;
        this.createdAt = now;
    }

    /**
     * Creates an active book from an uploaded EPUB.
     *
     * @param converted conversion result
     * @param now       import instant
     * @return new book
     */
    public static Book fromUpload(ConvertedBook converted, Instant now) {
        return new Book(converted, BookSource.UPLOAD, null, null, now);
    }

    /**
     * Creates an active book from a catalogue entry.
     *
     * @param converted conversion result
     * @param entryId   catalogue entry identifier, also the URL of its page
     * @param now       import instant
     * @return new book
     */
    public static Book fromCatalogue(ConvertedBook converted, String entryId, Instant now) {
        return new Book(converted, BookSource.CATALOGUE, entryId, entryId, now);
    }

    /**
     * Renames the book.
     *
     * @param newTitle non-blank title
     */
    public void rename(String newTitle) {
        this.title = newTitle.strip();
    }

    /**
     * Changes the author.
     *
     * @param newAuthor non-blank author
     */
    public void changeAuthor(String newAuthor) {
        this.author = newAuthor.strip();
    }

    /**
     * Shows the book to the reader again; it counts as newly added in the reader's list.
     *
     * @param now activation instant
     */
    public void activate(Instant now) {
        if (!active) {
            this.active = true;
            this.activatedAt = now;
        }
    }

    /**
     * Hides the book from the reader without deleting it.
     */
    public void withdraw() {
        this.active = false;
    }

    /**
     * Marks the book as read from the backoffice; the reader then shows it finished.
     *
     * @param now marking instant
     */
    public void markFinished(Instant now) {
        this.finishedAt = now;
    }

    /**
     * Removes the read mark set from the backoffice.
     */
    public void markUnfinished() {
        this.finishedAt = null;
    }

    /**
     * Returns the identifier.
     *
     * @return book identifier
     */
    public UUID getId() {
        return id;
    }

    /**
     * Returns the title.
     *
     * @return title
     */
    public String getTitle() {
        return title;
    }

    /**
     * Returns the author.
     *
     * @return author
     */
    public String getAuthor() {
        return author;
    }

    /**
     * Returns the source.
     *
     * @return catalogue or upload
     */
    public BookSource getSource() {
        return source;
    }

    /**
     * Returns the source URL.
     *
     * @return catalogue entry URL, {@code null} for an upload
     */
    public String getSourceUrl() {
        return sourceUrl;
    }

    /**
     * Returns the blocks.
     *
     * @return blocks in reading order
     */
    public List<Block> getContent() {
        return List.copyOf(content);
    }

    /**
     * Returns the number of blocks.
     *
     * @return block count
     */
    public int getBlockCount() {
        return blockCount;
    }

    /**
     * Returns whether the reader sees the book.
     *
     * @return {@code true} when active
     */
    public boolean isActive() {
        return active;
    }

    /**
     * Returns the last activation instant.
     *
     * @return activation instant
     */
    public Instant getActivatedAt() {
        return activatedAt;
    }

    /**
     * Returns the import instant.
     *
     * @return creation instant
     */
    public Instant getCreatedAt() {
        return createdAt;
    }

    /**
     * Returns when the book was marked as read from the backoffice.
     *
     * @return marking instant, {@code null} when unmarked
     */
    public Instant getFinishedAt() {
        return finishedAt;
    }
}
