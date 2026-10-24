package io.github.thomashtn.bookreader.conversion.model;

import io.github.thomashtn.bookreader.shared.model.MetadataLimits;
import java.util.List;

/**
 * Result of an EPUB conversion, before it is persisted.
 *
 * @param title  title from the OPF, at most {@link MetadataLimits#MAX_LENGTH} characters
 * @param author first creator from the OPF, at most {@link MetadataLimits#MAX_LENGTH} characters
 * @param blocks blocks in reading order, never empty
 */
public record ConvertedBook(String title, String author, List<Block> blocks) {

    /**
     * Cuts overlong metadata, which would otherwise fail the insert, and copies the blocks.
     */
    public ConvertedBook {
        title = truncate(title);
        author = truncate(author);
        blocks = List.copyOf(blocks);
    }

    /**
     * Cuts a text to {@link MetadataLimits#MAX_LENGTH} characters.
     *
     * @param text metadata text
     * @return the text, or its longest prefix that fits
     */
    private static String truncate(String text) {
        if (text.length() <= MetadataLimits.MAX_LENGTH) {
            return text;
        }
        // Never split a surrogate pair.
        int end = Character.isHighSurrogate(text.charAt(MetadataLimits.MAX_LENGTH - 1))
            ? MetadataLimits.MAX_LENGTH - 1
            : MetadataLimits.MAX_LENGTH;
        return text.substring(0, end);
    }
}
