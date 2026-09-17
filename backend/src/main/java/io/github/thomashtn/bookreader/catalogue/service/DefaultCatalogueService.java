package io.github.thomashtn.bookreader.catalogue.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.book.repository.CatalogueBookState;
import io.github.thomashtn.bookreader.catalogue.client.OpdsCatalogueClient;
import io.github.thomashtn.bookreader.catalogue.client.OpdsEntry;
import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryResponse;
import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryState;
import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import io.github.thomashtn.bookreader.shared.exception.InvalidRequestException;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Default {@link CatalogueService}. Deliberately not transactional: the catalogue is called outside any
 * transaction, conversion happens in memory, and each repository call runs its own short transaction.
 */
@Service
public class DefaultCatalogueService implements CatalogueService {

    /**
     * Book page of the catalogue; only its number is used, the download URL is built from configuration.
     */
    private static final Pattern ENTRY_ID = Pattern.compile("https?://[^/?#]+/details\\.php\\?book=(\\d{1,9})");

    private final OpdsCatalogueClient client;

    private final EpubConverter converter;

    private final BookRepository repository;

    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param client     OPDS client
     * @param converter  EPUB converter
     * @param repository book repository
     * @param clock      application clock
     */
    public DefaultCatalogueService(
        OpdsCatalogueClient client, EpubConverter converter, BookRepository repository, Clock clock
    ) {
        this.client = client;
        this.converter = converter;
        this.repository = repository;
        this.clock = clock;
    }

    @Override
    public List<CatalogueEntryResponse> search(String query) {
        if (query == null || query.isBlank()) {
            throw new InvalidRequestException("The search query must not be blank.");
        }
        List<OpdsEntry> entries = client.search(query);
        Map<String, Boolean> activeBySourceId = repository
            .findBySourceIdIn(entries.stream().map(OpdsEntry::id).toList())
            .stream()
            .collect(Collectors.toMap(CatalogueBookState::getSourceId, CatalogueBookState::isActive));
        return entries.stream()
            .map(entry -> new CatalogueEntryResponse(
                entry.id(), entry.title(), entry.author(), entry.summary(), stateOf(activeBySourceId.get(entry.id()))
            ))
            .toList();
    }

    @Override
    public CatalogueImportResult importEntry(String entryId) {
        Matcher matcher = ENTRY_ID.matcher(entryId);
        if (!matcher.matches()) {
            throw new InvalidRequestException("The entry identifier is not a catalogue book page.");
        }
        Optional<Book> existing = repository.findBySourceId(entryId);
        if (existing.isPresent()) {
            Book book = existing.get();
            book.activate(clock.instant());
            return new CatalogueImportResult(AdminBookResponse.from(repository.save(book)), false);
        }
        byte[] epub = client.downloadEpub(Integer.parseInt(matcher.group(1)));
        ConvertedBook converted = converter.convert(epub);
        Book book = repository.save(Book.fromCatalogue(converted, entryId, clock.instant()));
        return new CatalogueImportResult(AdminBookResponse.from(book), true);
    }

    private static CatalogueEntryState stateOf(Boolean active) {
        if (active == null) {
            return CatalogueEntryState.NOT_IMPORTED;
        }
        return active ? CatalogueEntryState.ACTIVE : CatalogueEntryState.WITHDRAWN;
    }
}
