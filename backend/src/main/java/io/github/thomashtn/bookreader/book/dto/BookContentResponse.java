package io.github.thomashtn.bookreader.book.dto;

import io.github.thomashtn.bookreader.book.entity.Book;
import io.github.thomashtn.bookreader.conversion.model.Block;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

/**
 * A book in the internal format (specification section 7.3).
 *
 * @param id     identifier
 * @param title  title
 * @param author author
 * @param blocks blocks in reading order
 */
@Schema(description = "Book in the internal format.")
public record BookContentResponse(UUID id, String title, String author, List<Block> blocks) {

    /**
     * Copies the blocks so the response stays immutable.
     */
    public BookContentResponse {
        blocks = List.copyOf(blocks);
    }

    /**
     * Maps the entity.
     *
     * @param book entity
     * @return response
     */
    public static BookContentResponse from(Book book) {
        return new BookContentResponse(book.getId(), book.getTitle(), book.getAuthor(), book.getContent());
    }
}
