package io.github.thomashtn.bookreader.catalogue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Catalogue search result.
 *
 * @param entryId identifier to send back to activate the entry
 * @param title   title
 * @param author  author, empty when unknown
 * @param summary plain-text summary, empty when absent
 * @param state   import state in the library
 */
@Schema(description = "Catalogue entry offering an EPUB.")
public record CatalogueEntryResponse(
    String entryId,
    String title,
    String author,
    String summary,
    CatalogueEntryState state
) {
}
