package io.github.thomashtn.bookreader.book.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import java.util.List;
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
     * Converts an uploaded EPUB and activates it immediately.
     *
     * @param epub archive bytes
     * @return imported book
     * @throws io.github.thomashtn.bookreader.conversion.EpubRejectedException when the EPUB is unusable
     */
    AdminBookResponse importUpload(byte[] epub);
}
