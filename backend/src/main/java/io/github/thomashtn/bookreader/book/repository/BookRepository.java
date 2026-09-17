package io.github.thomashtn.bookreader.book.repository;

import io.github.thomashtn.bookreader.book.entity.Book;
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
}
