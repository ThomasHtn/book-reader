package io.github.thomashtn.bookreader.catalogue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Catalogue entry to activate.
 *
 * @param entryId identifier returned by the search
 */
@Schema(description = "Catalogue entry to activate.")
public record ImportCatalogueEntryRequest(
    @NotBlank @Schema(example = "https://www.ebooksgratuits.com/details.php?book=726") String entryId
) {
}
