package io.github.thomashtn.bookreader.book.controller;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.bookreader.book.dto.BookContentResponse;
import io.github.thomashtn.bookreader.book.dto.BookSummaryResponse;
import io.github.thomashtn.bookreader.book.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public read access to active books, used by the reader.
 */
@RestController
@RequestMapping("/api/books")
@Tag(name = "Books", description = "Books the reader can open.")
public class BookController {

    private final BookService service;

    /**
     * Creates the controller.
     *
     * @param service book service
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "Spring-managed singleton service, shared by design; its delete method trips the heuristic."
    )
    public BookController(BookService service) {
        this.service = service;
    }

    /**
     * Lists active books.
     *
     * @return active books, most recently activated first
     */
    @GetMapping
    @Operation(summary = "List active books")
    public List<BookSummaryResponse> listBooks() {
        return service.listActiveBooks();
    }

    /**
     * Returns an active book in the internal format.
     *
     * @param id book identifier
     * @return book with its blocks
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get an active book with its content")
    @ApiResponse(responseCode = "200", description = "Book in the internal format.")
    @ApiResponse(responseCode = "404", description = "Unknown or withdrawn book.")
    public BookContentResponse getBook(@PathVariable UUID id) {
        return service.getActiveBook(id);
    }
}
