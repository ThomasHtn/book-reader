package io.github.thomashtn.bookreader.conversion.model;

import java.util.List;

/**
 * Result of an EPUB conversion, before it is persisted.
 *
 * @param title  title from the OPF, at most {@link #MAX_METADATA_LENGTH} characters
 * @param author first creator from the OPF, at most {@link #MAX_METADATA_LENGTH} characters
 * @param blocks blocks in reading order, never empty
 */
public record ConvertedBook(String title, String author, List<Block> blocks) {

    /**
     * Longest title or author kept, the size of the {@code book.title} and {@code book.author} columns.
     */
    public static final int MAX_METADATA_LENGTH = 500;

    /**
     * Cuts overlong metadata, which would otherwise fail the insert, and copies the blocks.
     */
    public ConvertedBook {
        title = truncate(title);
        author = truncate(author);
        blocks = List.copyOf(blocks);
    }

    private static String truncate(String text) {
        if (text.length() <= MAX_METADATA_LENGTH) {
            return text;
        }
        // Never split a surrogate pair.
        int end = Character.isHighSurrogate(text.charAt(MAX_METADATA_LENGTH - 1))
            ? MAX_METADATA_LENGTH - 1
            : MAX_METADATA_LENGTH;
        return text.substring(0, end);
    }
}
