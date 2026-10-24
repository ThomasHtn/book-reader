package io.github.thomashtn.bookreader.book.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.book.repository.CatalogueBookState;
import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default {@link BookService}: reads run in read-only transactions. An import receives the EPUB already read
 * or downloaded outside any transaction, converts it in memory, then persists it in one short transaction.
 */
@Service
public class DefaultBookService implements BookService {

    /**
     * Name PostgreSQL gives the unique constraint on {@code book.source_id} (migration V2).
     */
    private static final String SOURCE_ID_CONSTRAINT = "book_source_id_key";

    /**
     * Caller-facing message of every unknown book.
     */
    private static final String NOT_FOUND = "Book not found.";

    /**
     * Repository holding books.
     */
    private final BookRepository repository;

    /**
     * Converter turning an EPUB into blocks.
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
     * Converts the uploaded EPUB in memory, then persists it.
     *
     * @param epub archive bytes
     * @return imported book, active
     * @throws io.github.thomashtn.bookreader.conversion.EpubRejectedException when the EPUB is unusable
     */
    @Override
    public AdminBookResponse importUpload(byte[] epub) {
        return persist(Book.fromUpload(converter.convert(epub), clock.instant()));
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
     * Converts the downloaded EPUB in memory, then persists it; a concurrent import of the same entry fails
     * right here, on the unique source identifier.
     *
     * @param epub     archive bytes
     * @param sourceId catalogue entry identifier
     * @return imported book, active
     * @throws BookAlreadyImportedException when the entry is already in the library
     */
    @Override
    public AdminBookResponse importCatalogueEpub(byte[] epub, String sourceId) {
        Book book = Book.fromCatalogue(converter.convert(epub), sourceId, clock.instant());
        try {
            return persist(book);
        } catch (DataIntegrityViolationException exception) {
            if (violatesSourceIdUniqueness(exception)) {
                throw new BookAlreadyImportedException(sourceId, exception);
            }
            throw exception;
        }
    }

    /**
     * Persists a book in the repository's own short transaction.
     *
     * @param book new book
     * @return imported book
     */
    private AdminBookResponse persist(Book book) {
        return AdminBookResponse.from(repository.save(book));
    }

    /**
     * Tells whether an integrity violation is the unique constraint on the catalogue source identifier.
     *
     * @param exception violation raised while saving
     * @return {@code false} for any other violation, which must not be mistaken for a duplicate
     */
    private static boolean violatesSourceIdUniqueness(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                && SOURCE_ID_CONSTRAINT.equals(violation.getConstraintName())) {
                return true;
            }
        }
        return false;
    }
}
