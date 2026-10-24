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
    @NotNull @Schema(example = "32", allowableValues = {"28", "32", "36", "40"}) Integer fontTier
) {

    /**
     * Checks the tier against the supported ones; a missing tier is reported by {@code @NotNull}.
     *
     * @return {@code true} when the tier is absent or supported
     */
    @JsonIgnore
    @AssertTrue(message = "must be 28, 32, 36 or 40")
    public boolean isSupportedFontTier() {
        return fontTier == null || ReaderSettings.FONT_TIERS.contains(fontTier);
    }
}
