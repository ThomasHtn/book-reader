package io.github.thomashtn.bookreader.catalogue.service;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;

/**
 * Outcome of a catalogue activation.
 *
 * @param book    activated book
 * @param created {@code true} when downloaded and converted, {@code false} when an existing book was reactivated
 */
public record CatalogueImportResult(AdminBookResponse book, boolean created) {
}
