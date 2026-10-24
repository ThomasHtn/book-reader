package io.github.thomashtn.bookreader.settings.dto;

import io.github.thomashtn.bookreader.settings.entity.ReaderSettings;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Display settings as the reader applies them.
 *
 * @param fontTier font tier in pixels (28, 32, 36 or 40)
 */
@Schema(description = "Global reader display settings.")
public record ReaderSettingsResponse(
    @Schema(example = "32") int fontTier
) {

    /**
     * Maps the entity to its API representation.
     *
     * @param settings persisted settings
     * @return response
     */
    public static ReaderSettingsResponse from(ReaderSettings settings) {
        return new ReaderSettingsResponse(settings.getFontTier());
    }
}
