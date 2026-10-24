package io.github.thomashtn.bookreader.book.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads and manages the library.
 */
public interface BookService {

    /**
     * Lists the books the reader sees.
     *
     * @return active books, most recently activated first
     */
    List<BookSummaryResponse> listActiveBooks();

    /**
     * Returns an active book with its content.
     *
     * @param id book identifier
     * @return book in the internal format
     * @throws io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException when unknown or withdrawn
     */
    BookContentResponse getActiveBook(UUID id);

    /**
     * Lists every imported book.
     *
     * @return all books, most recently imported first
     */
    List<AdminBookResponse> listAllBooks();

    /**
     * Applies a partial change.
     *
     * @param id      book identifier
     * @param request fields to change
     * @return book after the change
     * @throws io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException when unknown
     */
    AdminBookResponse updateBook(UUID id, UpdateBookRequest request);

    /**
     * Deletes a book and its content for good.
     *
     * @param id book identifier
     * @throws io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException when unknown
     */
    void deleteBook(UUID id);

    /**
     * Converts an uploaded EPUB and activates it immediately.
     *
     * @param epub archive bytes
     * @return imported book
     * @throws io.github.thomashtn.bookreader.conversion.EpubRejectedException when the EPUB is unusable
     */
    AdminBookResponse importUpload(byte[] epub);

    /**
     * Tells which catalogue entries are already in the library, and whether the reader sees them.
     *
     * @param sourceIds catalogue entry identifiers
     * @return active flag of each imported entry; entries never imported are absent
     */
    Map<String, Boolean> activeFlagsBySourceId(Collection<String> sourceIds);

    /**
     * Shows an imported catalogue book again; it counts as newly added in the reader's list.
     *
     * @param sourceId catalogue entry identifier
     * @return reactivated book, empty when the entry was never imported
     */
    Optional<AdminBookResponse> reactivateCatalogueBook(String sourceId);

    /**
     * Saves a converted catalogue book, active.
     *
     * @param converted converted EPUB
     * @param sourceId  catalogue entry identifier
     * @return imported book
     * @throws org.springframework.dao.DataIntegrityViolationException when the entry was imported concurrently
     */
    AdminBookResponse saveCatalogueBook(ConvertedBook converted, String sourceId);
}
