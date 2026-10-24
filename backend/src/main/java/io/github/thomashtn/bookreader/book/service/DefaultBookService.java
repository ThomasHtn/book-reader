package io.github.thomashtn.bookreader.book.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.book.repository.CatalogueBookState;
import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default {@link BookService}: reads run in read-only transactions, the upload converts outside any.
 */
@Service
public class DefaultBookService implements BookService {

    /**
     * Caller-facing message of every unknown book.
     */
    private static final String NOT_FOUND = "Book not found.";

    /**
     * Repository holding books.
     */
    private final BookRepository repository;

    /**
     * Converter turning an uploaded EPUB into blocks.
     */
    private final EpubConverter converter;

    /**
     * Clock stamping imports, activations and read marks.
     */
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

    /**
     * Lists active books from a projection, so the JSONB content is never loaded.
     *
     * @return active books, most recently activated first
     */
    @Override
    @Transactional(readOnly = true)
    public List<BookSummaryResponse> listActiveBooks() {
        return repository.findByActiveTrueOrderByActivatedAtDesc().stream().map(BookSummaryResponse::from).toList();
    }

    /**
     * Loads an active book with its content; a withdrawn book is as unknown as a missing one.
     *
     * @param id book identifier
     * @return book in the internal format
     * @throws ResourceNotFoundException when unknown or withdrawn
     */
    @Override
    @Transactional(readOnly = true)
    public BookContentResponse getActiveBook(UUID id) {
        return repository.findByIdAndActiveTrue(id)
            .map(BookContentResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
    }

    /**
     * Lists every book from a projection, so the JSONB content is never loaded.
     *
     * @return all books, most recently imported first
     */
    @Override
    @Transactional(readOnly = true)
    public List<AdminBookResponse> listAllBooks() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(AdminBookResponse::from).toList();
    }

    /**
     * Applies each present field in one transaction; a {@code null} field is left unchanged.
     *
     * @param id      book identifier
     * @param request fields to change
     * @return book after the change
     * @throws ResourceNotFoundException when unknown
     */
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
        if (Boolean.TRUE.equals(request.finished())) {
            book.markFinished(clock.instant());
        } else if (Boolean.FALSE.equals(request.finished())) {
            book.markUnfinished();
        }
        return AdminBookResponse.from(book);
    }

    /**
     * Deletes the row and its content; a catalogue entry can then be imported again.
     *
     * @param id book identifier
     * @throws ResourceNotFoundException when unknown
     */
    @Override
    @Transactional
    public void deleteBook(UUID id) {
        Book book = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
        repository.delete(book);
    }

    /**
     * Converts outside any transaction, then persists in the repository's own short transaction.
     *
     * @param epub archive bytes
     * @return imported book, active
     * @throws io.github.thomashtn.bookreader.conversion.EpubRejectedException when the EPUB is unusable
     */
    @Override
    public AdminBookResponse importUpload(byte[] epub) {
        ConvertedBook converted = converter.convert(epub);
        return AdminBookResponse.from(repository.save(Book.fromUpload(converted, clock.instant())));
    }

    /**
     * Reads the import states in a single query, without the content.
     *
     * @param sourceIds catalogue entry identifiers
     * @return active flag of each imported entry
     */
    @Override
    @Transactional(readOnly = true)
    public Map<String, Boolean> activeFlagsBySourceId(Collection<String> sourceIds) {
        return repository.findBySourceIdIn(sourceIds).stream()
            .collect(Collectors.toMap(CatalogueBookState::getSourceId, CatalogueBookState::isActive));
    }

    /**
     * Activates the book in one transaction, stamping the activation with the clock.
     *
     * @param sourceId catalogue entry identifier
     * @return reactivated book, empty when never imported
     */
    @Override
    @Transactional
    public Optional<AdminBookResponse> reactivateCatalogueBook(String sourceId) {
        return repository.findBySourceId(sourceId).map(book -> {
            book.activate(clock.instant());
            return AdminBookResponse.from(book);
        });
    }

    /**
     * Persists in the repository's own short transaction, so a concurrent import fails right here.
     *
     * @param converted converted EPUB
     * @param sourceId  catalogue entry identifier
     * @return imported book, active
     */
    @Override
    public AdminBookResponse saveCatalogueBook(ConvertedBook converted, String sourceId) {
        return AdminBookResponse.from(repository.save(Book.fromCatalogue(converted, sourceId, clock.instant())));
    }
}
