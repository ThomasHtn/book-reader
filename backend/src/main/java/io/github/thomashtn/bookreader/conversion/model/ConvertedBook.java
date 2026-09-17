package io.github.thomashtn.bookreader.conversion.model;

import java.util.List;

/**
 * Result of an EPUB conversion, before it is persisted.
 *
 * @param title  title from the OPF
 * @param author first creator from the OPF
 * @param blocks blocks in reading order, never empty
 */
public record ConvertedBook(String title, String author, List<Block> blocks) {

    /**
     * Copies the blocks so the result stays immutable.
     */
    public ConvertedBook {
        blocks = List.copyOf(blocks);
    }
}
