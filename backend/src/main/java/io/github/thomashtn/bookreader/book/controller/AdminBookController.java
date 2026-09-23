package io.github.thomashtn.bookreader.book.controller;

import static io.github.thomashtn.bookreader.shared.config.OpenApiConfig.ADMIN_KEY_SECURITY_SCHEME;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.book.dto.UpdateBookRequest;
import io.github.thomashtn.bookreader.book.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Backoffice library: every imported book, uploads, withdrawals and corrections.
 */
@RestController
@RequestMapping("/api/admin/books")
@Tag(name = "Administration - Books", description = "Library management.")
@SecurityRequirement(name = ADMIN_KEY_SECURITY_SCHEME)
public class AdminBookController {

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
    public AdminBookController(BookService service) {
        this.service = service;
    }

    /**
     * Lists every imported book, active or withdrawn.
     *
     * @return all books
     */
    @GetMapping
    @Operation(summary = "List every imported book")
    public List<AdminBookResponse> listBooks() {
        return service.listAllBooks();
    }

    /**
     * Converts an uploaded EPUB and activates it.
     *
     * @param file EPUB file
     * @return imported book
     * @throws IOException when the upload cannot be read
     */
    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload, convert and activate an EPUB")
    @ApiResponse(responseCode = "201", description = "Book imported and active.")
    @ApiResponse(responseCode = "422", description = "Encrypted, invalid, too large or without text.")
    public ResponseEntity<AdminBookResponse> upload(@RequestPart("file") MultipartFile file) throws IOException {
        AdminBookResponse book = service.importUpload(file.getBytes());
        return ResponseEntity.created(URI.create("/api/books/" + book.id())).body(book);
    }

    /**
     * Corrects title or author, withdraws or reactivates a book, marks it as read or unread.
     *
     * @param id      book identifier
     * @param request fields to change
     * @return book after the change
     */
    @PatchMapping("/{id}")
    @Operation(summary = "Change title, author, activation or read mark")
    @ApiResponse(responseCode = "200", description = "Book updated.")
    @ApiResponse(responseCode = "404", description = "Unknown book.")
    public AdminBookResponse updateBook(@PathVariable UUID id, @Valid @RequestBody UpdateBookRequest request) {
        return service.updateBook(id, request);
    }

    /**
     * Deletes a book for good; a catalogue entry can be activated again afterwards.
     *
     * @param id book identifier
     * @return empty response
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a book for good")
    @ApiResponse(responseCode = "204", description = "Book deleted.")
    @ApiResponse(responseCode = "404", description = "Unknown book.")
    public ResponseEntity<Void> deleteBook(@PathVariable UUID id) {
        service.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}
