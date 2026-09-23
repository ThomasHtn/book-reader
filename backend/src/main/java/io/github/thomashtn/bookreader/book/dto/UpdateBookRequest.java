package io.github.thomashtn.bookreader.book.dto;

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
    @Pattern(regexp = ".*\\S.*", message = "must not be blank") @Size(max = 500) String title,
    @Pattern(regexp = ".*\\S.*", message = "must not be blank") @Size(max = 500) String author,
    Boolean active,
    Boolean finished
) {
}
