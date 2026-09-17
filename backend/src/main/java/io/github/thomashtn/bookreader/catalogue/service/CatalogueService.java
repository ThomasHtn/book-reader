package io.github.thomashtn.bookreader.catalogue.service;

import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryResponse;
import java.util.List;

/**
 * Searches the OPDS catalogue and activates its books.
 */
public interface CatalogueService {

    /**
     * Relays a search to the catalogue and adds each entry's import state.
     *
     * @param query non-blank query
     * @return entries offering an EPUB
     * @throws io.github.thomashtn.bookreader.shared.exception.InvalidRequestException when the query is blank
     */
    List<CatalogueEntryResponse> search(String query);

    /**
     * Activates a catalogue entry: reactivates it when already imported, otherwise downloads and converts it.
     *
     * @param entryId entry identifier from the search
     * @return activated book and whether it was created
     * @throws io.github.thomashtn.bookreader.shared.exception.InvalidRequestException when the identifier is foreign
     */
    CatalogueImportResult importEntry(String entryId);
}
