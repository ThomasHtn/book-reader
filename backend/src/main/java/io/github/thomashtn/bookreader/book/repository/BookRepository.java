package io.github.thomashtn.bookreader.book.repository;

import io.github.thomashtn.bookreader.book.entity.Book;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Access to imported books.
 */
public interface BookRepository extends JpaRepository<Book, UUID> {

    /**
     * Lists the books the reader sees, most recently activated first.
     *
     * @return active book summaries
     */
    List<BookSummary> findByActiveTrueOrderByActivatedAtDesc();

    /**
     * Lists every imported book, most recently imported first.
     *
     * @return all book summaries
     */
    List<BookSummary> findAllByOrderByCreatedAtDesc();

    /**
     * Finds a book the reader may open.
     *
     * @param id book identifier
     * @return the book when it exists and is active
     */
    Optional<Book> findByIdAndActiveTrue(UUID id);

    /**
     * Finds the book imported from a catalogue entry.
     *
     * @param sourceId catalogue entry identifier
     * @return the book when the entry was imported
     */
    Optional<Book> findBySourceId(String sourceId);

    /**
     * Returns the import state of the catalogue entries already in the library.
     *
     * @param sourceIds catalogue entry identifiers
     * @return states of the imported ones
     */
    List<CatalogueBookState> findBySourceIdIn(Collection<String> sourceIds);
}
