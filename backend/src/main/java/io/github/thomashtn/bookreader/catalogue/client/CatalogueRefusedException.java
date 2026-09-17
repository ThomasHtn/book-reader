package io.github.thomashtn.bookreader.catalogue.client;

/**
 * Signals that the catalogue answered a download with a web page instead of the EPUB, which it does
 * when it bans an address for downloading too much.
 */
public class CatalogueRefusedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception.
     *
     * @param contentType content type the site answered with
     */
    public CatalogueRefusedException(String contentType) {
        super("Catalogue answered a download with " + contentType);
    }
}
