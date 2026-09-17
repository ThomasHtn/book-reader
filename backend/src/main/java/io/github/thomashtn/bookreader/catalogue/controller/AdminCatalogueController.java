package io.github.thomashtn.bookreader.catalogue.controller;

import static io.github.thomashtn.bookreader.shared.config.OpenApiConfig.ADMIN_KEY_SECURITY_SCHEME;

import io.github.thomashtn.bookreader.book.dto.AdminBookResponse;
import io.github.thomashtn.bookreader.catalogue.dto.CatalogueEntryResponse;
import io.github.thomashtn.bookreader.catalogue.dto.ImportCatalogueEntryRequest;
import io.github.thomashtn.bookreader.catalogue.service.CatalogueImportResult;
import io.github.thomashtn.bookreader.catalogue.service.CatalogueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Backoffice access to the Ebooks libres et gratuits catalogue.
 */
@RestController
@Tag(name = "Administration - Catalogue", description = "Live search and activation of catalogue books.")
@SecurityRequirement(name = ADMIN_KEY_SECURITY_SCHEME)
public class AdminCatalogueController {

    private final CatalogueService service;

    /**
     * Creates the controller.
     *
     * @param service catalogue service
     */
    public AdminCatalogueController(CatalogueService service) {
        this.service = service;
    }

    /**
     * Relays a search to the catalogue.
     *
     * @param query title or author
     * @return entries offering an EPUB, with their import state
     */
    @GetMapping("/api/admin/catalogue")
    @Operation(summary = "Search the catalogue by title or author")
    @ApiResponse(responseCode = "200", description = "First page of results.")
    @ApiResponse(responseCode = "503", description = "Catalogue site unreachable.")
    public List<CatalogueEntryResponse> search(@RequestParam String query) {
        return service.search(query);
    }

    /**
     * Activates a catalogue entry.
     *
     * @param request entry to activate
     * @return 201 when downloaded and converted, 200 when an imported book was reactivated
     */
    @PostMapping("/api/admin/books/from-catalogue")
    @Operation(summary = "Download, convert and activate a catalogue entry, or reactivate it")
    @ApiResponse(responseCode = "201", description = "Book imported and active.")
    @ApiResponse(responseCode = "200", description = "Book already imported, now active.")
    @ApiResponse(responseCode = "422", description = "EPUB encrypted, invalid, too large or without text.")
    @ApiResponse(responseCode = "503", description = "Catalogue site unreachable.")
    public ResponseEntity<AdminBookResponse> importEntry(@Valid @RequestBody ImportCatalogueEntryRequest request) {
        CatalogueImportResult result = service.importEntry(request.entryId());
        if (!result.created()) {
            return ResponseEntity.ok(result.book());
        }
        return ResponseEntity.created(URI.create("/api/books/" + result.book().id())).body(result.book());
    }
}
