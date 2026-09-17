package io.github.thomashtn.bookreader.settings.service;

import io.github.thomashtn.bookreader.settings.dto.ReaderSettingsResponse;
import io.github.thomashtn.bookreader.settings.dto.UpdateReaderSettingsRequest;

/**
 * Reads and changes the global reader display settings.
 */
public interface ReaderSettingsService {

    /**
     * Returns the current settings.
     *
     * @return current settings
     */
    ReaderSettingsResponse getSettings();

    /**
     * Replaces the settings.
     *
     * @param request validated new settings
     * @return settings after the change
     */
    ReaderSettingsResponse updateSettings(UpdateReaderSettingsRequest request);
}
