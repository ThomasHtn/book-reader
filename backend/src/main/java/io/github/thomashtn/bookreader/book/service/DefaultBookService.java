package io.github.thomashtn.bookreader.book.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default {@link BookService}.
 */
@Service
public class DefaultBookService implements BookService {

    private static final String NOT_FOUND = "Book not found.";

    private final BookRepository repository;

    private final EpubConverter converter;

    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param repository book repository
     * @param converter  EPUB converter
     * @param clock      application clock
     */
    public DefaultBookService(BookRepository repository, EpubConverter converter, Clock clock) {
        this.repository = repository;
        this.converter = converter;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookSummaryResponse> listActiveBooks() {
        return repository.findByActiveTrueOrderByActivatedAtDesc().stream().map(BookSummaryResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookContentResponse getActiveBook(UUID id) {
        return repository.findByIdAndActiveTrue(id)
            .map(BookContentResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminBookResponse> listAllBooks() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(AdminBookResponse::from).toList();
    }

    @Override
    @Transactional
    public AdminBookResponse updateBook(UUID id, UpdateBookRequest request) {
        Book book = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
        if (request.title() != null) {
            book.rename(request.title());
        }
        if (request.author() != null) {
            book.changeAuthor(request.author());
        }
        if (Boolean.TRUE.equals(request.active())) {
            book.activate(clock.instant());
        } else if (Boolean.FALSE.equals(request.active())) {
            book.withdraw();
        }
        return AdminBookResponse.from(book);
    }

    /**
     * Converts outside any transaction, then persists in the repository's own short transaction.
     */
    @Override
    public AdminBookResponse importUpload(byte[] epub) {
        ConvertedBook converted = converter.convert(epub);
        return AdminBookResponse.from(repository.save(Book.fromUpload(converted, clock.instant())));
    }
}
