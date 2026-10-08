package io.github.thomashtn.bookreader.book.dto;

import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Partial change of a book; omitted fields stay unchanged.
 *
 * @param title    new title
 * @param author   new author
 * @param active   {@code false} withdraws the book, {@code true} reactivates it
 * @param finished {@code true} marks the book as read, {@code false} removes the mark
 */
@Schema(description = "Partial update of a book.")
public record UpdateBookRequest(
    // Not @NotBlank: null means "unchanged" in a PATCH, only a present but blank value is refused.
    @Pattern(regexp = UpdateBookRequest.NOT_BLANK, message = "must not be blank")
    @Size(max = ConvertedBook.MAX_METADATA_LENGTH)
    String title,
    @Pattern(regexp = UpdateBookRequest.NOT_BLANK, message = "must not be blank")
    @Size(max = ConvertedBook.MAX_METADATA_LENGTH)
    String author,
    Boolean active,
    Boolean finished
) {

    /**
     * Matches a value holding at least one non-space character.
     */
    static final String NOT_BLANK = ".*\\S.*";
}
