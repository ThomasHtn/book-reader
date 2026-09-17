package io.github.thomashtn.bookreader.book.repository;

/**
 * Import state of a catalogue book, without its content.
 */
public interface CatalogueBookState {

    /**
     * Returns the catalogue entry identifier.
     *
     * @return entry identifier
     */
    String getSourceId();

    /**
     * Returns whether the book is active.
     *
     * @return active flag
     */
    boolean isActive();
}
