package io.github.thomashtn.bookreader.catalogue.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.service.BookService;
import io.github.thomashtn.bookreader.catalogue.client.OpdsCatalogueClient;
import io.github.thomashtn.bookreader.catalogue.client.OpdsEntry;
import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryResponse;
import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryState;
import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import io.github.thomashtn.bookreader.shared.exception.InvalidRequestException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Default {@link CatalogueService}. Deliberately not transactional: the catalogue is called outside any
 * transaction, conversion happens in memory, and each {@link BookService} call runs its own short one.
 */
@Service
public class DefaultCatalogueService implements CatalogueService {

    /**
     * Longest search relayed to the site, well above any title or author.
     */
    static final int MAX_QUERY_LENGTH = 200;

    /**
     * Client of the catalogue site.
     */
    private final OpdsCatalogueClient client;

    /**
     * Converter turning a downloaded EPUB into blocks.
     */
    private final EpubConverter converter;

    /**
     * Library the imported books join.
     */
    private final BookService books;

    /**
     * Creates the service.
     *
     * @param client    OPDS client
     * @param converter EPUB converter
     * @param books     library service
     */
    public DefaultCatalogueService(OpdsCatalogueClient client, EpubConverter converter, BookService books) {
        this.client = client;
        this.converter = converter;
        this.books = books;
    }

    /**
     * Relays the search, then reads the import state of every result in a single query.
     *
     * @param query non-blank query
     * @return entries offering an EPUB, in feed order
     * @throws InvalidRequestException when the query is blank or longer than any title
     */
    @Override
    public List<CatalogueEntryResponse> search(String query) {
        if (query == null || query.isBlank()) {
            throw new InvalidRequestException("The search query must not be blank.");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new InvalidRequestException("The search query must not exceed " + MAX_QUERY_LENGTH + " characters.");
        }
        List<OpdsEntry> entries = client.search(query);
        Map<String, Boolean> activeBySourceId =
            books.activeFlagsBySourceId(entries.stream().map(OpdsEntry::id).toList());
        return entries.stream()
            .map(entry -> new CatalogueEntryResponse(
                entry.id(), entry.title(), entry.author(), entry.summary(), stateOf(activeBySourceId.get(entry.id()))
            ))
            .toList();
    }

    /**
     * Reactivates an imported entry without contacting the site; otherwise downloads and converts it
     * outside any transaction. A concurrent import of the same entry ends as a reactivation.
     *
     * @param entryId entry identifier from the search
     * @return activated book and whether it was created
     * @throws InvalidRequestException when the identifier is not a catalogue book page
     */
    @Override
    public CatalogueImportResult importEntry(String entryId) {
        int bookNumber = OpdsCatalogueClient.bookNumberOf(entryId).orElseThrow(
            () -> new InvalidRequestException("The entry identifier is not a catalogue book page.")
        );
        return importBook(bookNumber, OpdsCatalogueClient.canonicalEntryId(bookNumber));
    }

    /**
     * Imports a book under its canonical identifier, so http, https or a leading zero never duplicate it.
     *
     * @param bookNumber number of the book page
     * @param entryId    canonical entry identifier, stored as the book's source
     * @return activated book and whether it was created
     */
    private CatalogueImportResult importBook(int bookNumber, String entryId) {
        Optional<AdminBookResponse> reactivated = books.reactivateCatalogueBook(entryId);
        if (reactivated.isPresent()) {
            return new CatalogueImportResult(reactivated.get(), false);
        }
        byte[] epub = client.downloadEpub(bookNumber);
        ConvertedBook converted = converter.convert(epub);
        try {
            return new CatalogueImportResult(books.saveCatalogueBook(converted, entryId), true);
        } catch (DataIntegrityViolationException exception) {
            // A concurrent activation of the same entry inserted it first (unique source_id).
            return new CatalogueImportResult(
                books.reactivateCatalogueBook(entryId).orElseThrow(() -> exception), false
            );
        }
    }

    /**
     * Maps the active flag of an imported book to the state shown in the backoffice.
     *
     * @param active active flag, {@code null} when the entry was never imported
     * @return import state
     */
    private static CatalogueEntryState stateOf(Boolean active) {
        if (active == null) {
            return CatalogueEntryState.NOT_IMPORTED;
        }
        return active ? CatalogueEntryState.ACTIVE : CatalogueEntryState.WITHDRAWN;
    }
}
