package io.github.thomashtn.bookreader.shared.model;

/**
 * Size limits shared by the layers that handle book metadata.
 */
public final class MetadataLimits {

    /**
     * Longest title or author kept, the size of the {@code book.title} and {@code book.author} columns.
     */
    public static final int MAX_LENGTH = 500;

    /**
     * Prevents instantiation of this constants holder.
     */
    private MetadataLimits() {
    }
}
