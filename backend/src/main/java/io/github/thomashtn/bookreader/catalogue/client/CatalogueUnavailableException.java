package io.github.thomashtn.bookreader.catalogue.client;

/**
 * Signals that the catalogue site did not answer usefully, even after one retry.
 */
public class CatalogueUnavailableException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception.
     *
     * @param message technical detail for the logs
     * @param cause   underlying failure
     */
    public CatalogueUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
