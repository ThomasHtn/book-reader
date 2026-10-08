package io.github.thomashtn.bookreader.shared.exception;

/**
 * Signals an unknown resource, or one the caller may not see; answered with 404 and its message.
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception with a message written for the caller.
     *
     * @param message error message exposed by the API
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
