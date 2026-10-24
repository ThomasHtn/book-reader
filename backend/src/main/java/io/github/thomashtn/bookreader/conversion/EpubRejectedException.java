package io.github.thomashtn.bookreader.conversion;

/**
 * Signals an EPUB the reader cannot use, with a reason the backoffice turns into a clear message.
 */
public class EpubRejectedException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Why the EPUB was refused.
     *
     * <p>Each {@link #code()} is part of the API contract: the backoffice maps it to a French message
     * in {@code frontend/src/app/core/admin/admin-message.ts}, so renaming a constant must not change it.</p>
     */
    public enum Reason {

        /**
         * Protected by DRM ({@code META-INF/encryption.xml}).
         */
        ENCRYPTED("EPUB_ENCRYPTED"),

        /**
         * No readable text once images, notes and front matter are removed.
         */
        NO_TEXT("EPUB_NO_TEXT"),

        /**
         * Above the upload size or the decompression limits.
         */
        TOO_LARGE("EPUB_TOO_LARGE"),

        /**
         * Not a ZIP archive, or not a well-formed EPUB.
         */
        INVALID("EPUB_INVALID");

        /**
         * Error code sent to the backoffice.
         */
        private final String code;

        /**
         * Binds a reason to its error code.
         *
         * @param code error code sent to the backoffice
         */
        Reason(String code) {
            this.code = code;
        }

        /**
         * Returns the error code the API answers with.
         *
         * @return stable code such as {@code EPUB_NO_TEXT}
         */
        public String code() {
            return code;
        }
    }

    /**
     * Why the EPUB was refused.
     */
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
