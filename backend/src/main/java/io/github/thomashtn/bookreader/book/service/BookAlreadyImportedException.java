package io.github.thomashtn.bookreader.book.service;

/**
 * Signals that a catalogue entry is already in the library, typically imported by a concurrent request.
 */
public class BookAlreadyImportedException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception.
     *
     * @param sourceId catalogue entry identifier
     * @param cause    unique constraint violation raised by the database
     */
    public BookAlreadyImportedException(String sourceId, Throwable cause) {
        super("Catalogue entry already imported: " + sourceId, cause);
    }
}
