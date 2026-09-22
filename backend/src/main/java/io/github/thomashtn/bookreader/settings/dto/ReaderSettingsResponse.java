package io.github.thomashtn.bookreader.settings.dto;

import io.github.thomashtn.bookreader.settings.entity.ReaderSettings;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Display settings as the reader applies them.
 *
 * @param fontTier font tier in pixels (48, 72, 100 or 140)
 */
@Schema(description = "Global reader display settings.")
public record ReaderSettingsResponse(
    @Schema(example = "100") int fontTier
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
