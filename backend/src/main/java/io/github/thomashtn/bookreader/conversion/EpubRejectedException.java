package io.github.thomashtn.bookreader.conversion;

/**
 * Signals an EPUB the reader cannot use, with a reason the backoffice turns into a clear message.
 */
public class EpubRejectedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * Why the EPUB was refused.
     */
    public enum Reason {

        /**
         * Protected by DRM ({@code META-INF/encryption.xml}).
         */
        ENCRYPTED,

        /**
         * No readable text once images, notes and front matter are removed.
         */
        NO_TEXT,

        /**
         * Above the decompression limits.
         */
        TOO_LARGE,

        /**
         * Not a ZIP archive, or not a well-formed EPUB.
         */
        INVALID
    }

    private final Reason reason;

    /**
     * Creates the exception.
     *
     * @param reason why the EPUB was refused
     * @param detail technical detail for the logs
     */
    public EpubRejectedException(Reason reason, String detail) {
        super(detail);
        this.reason = reason;
    }

    /**
     * Returns why the EPUB was refused.
     *
     * @return rejection reason
     */
    public Reason reason() {
        return reason;
    }
}
