package io.github.thomashtn.bookreader.conversion.model;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One block of a book: a single plain-text node for the reader, {@code \n} marking forced line breaks.
 *
 * @param kind heading or paragraph
 * @param text plain text, never blank
 */
@Schema(description = "Block of the internal book format.")
public record Block(BlockKind kind, String text) {

    /**
     * Creates a heading block.
     *
     * @param text heading text
     * @return heading block
     */
    public static Block heading(String text) {
        return new Block(BlockKind.HEADING, text);
    }

    /**
     * Creates a paragraph block.
     *
     * @param text paragraph text
     * @return paragraph block
     */
    public static Block paragraph(String text) {
        return new Block(BlockKind.PARAGRAPH, text);
    }
}
