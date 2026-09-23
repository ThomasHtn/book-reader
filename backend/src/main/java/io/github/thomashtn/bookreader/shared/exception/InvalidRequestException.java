package io.github.thomashtn.bookreader.shared.exception;

/**
 * Signals that the caller supplied a value the API cannot accept; answered with 400 and its message.
 *
 * <p>Throw it only for request input, with a message written for the caller. Broken internal
 * expectations stay {@link IllegalArgumentException} and end up as a logged 500.
 */
public class InvalidRequestException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception with a message written for the caller.
     *
     * @param message description of what the caller must correct
     */
    public InvalidRequestException(String message) {
        super(message);
    }
}
