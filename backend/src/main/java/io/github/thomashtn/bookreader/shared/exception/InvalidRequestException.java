package io.github.thomashtn.bookreader.shared.exception;

/**
 * Signals that the caller supplied a value the API cannot accept.
 *
 * <p>This exists to separate "the caller got it wrong" from "the application got it wrong". Both
 * used to surface as {@link IllegalArgumentException}, which the API mapped to 400 with the
 * exception's own text, so an internal invariant breaking anywhere below the controller was
 * reported to the caller as their mistake, with an internal message attached. Only this exception
 * is answered with 400, and only its message is safe to return: it is written for the caller.
 *
 * <p>Throw it for validation of request input. Leave {@link IllegalArgumentException} for broken
 * internal expectations, which belong in a 500 and in the logs.
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

    /**
     * Creates the exception with a message written for the caller and an underlying cause.
     *
     * @param message description of what the caller must correct
     * @param cause   underlying failure, kept for the logs and never returned to the caller
     */
    public InvalidRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
