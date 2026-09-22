package io.github.thomashtn.bookreader.settings.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.github.thomashtn.bookreader.settings.entity.ReaderSettings;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * New display settings chosen in the backoffice.
 *
 * @param fontTier font tier in pixels
 */
@Schema(description = "Reader display settings to apply.")
public record UpdateReaderSettingsRequest(
    @NotNull @Schema(example = "100", allowableValues = {"48", "72", "100", "140"}) Integer fontTier
) {

    /**
     * Checks the tier against the supported ones; a missing tier is reported by {@code @NotNull}.
     *
     * @return {@code true} when the tier is absent or supported
     */
    @JsonIgnore
    @AssertTrue(message = "must be 48, 72, 100 or 140")
    public boolean isSupportedFontTier() {
        return fontTier == null || ReaderSettings.FONT_TIERS.contains(fontTier);
    }
}
