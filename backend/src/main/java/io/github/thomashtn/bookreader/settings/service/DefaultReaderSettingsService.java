package io.github.thomashtn.bookreader.settings.service;

import io.github.thomashtn.bookreader.settings.dto.ReaderSettingsResponse;
import io.github.thomashtn.bookreader.settings.dto.UpdateReaderSettingsRequest;
import io.github.thomashtn.bookreader.settings.entity.ReaderSettings;
import io.github.thomashtn.bookreader.settings.repository.ReaderSettingsRepository;
import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default {@link ReaderSettingsService}, backed by the row the first migration inserts.
 */
@Service
public class DefaultReaderSettingsService implements ReaderSettingsService {

    /**
     * Repository holding the single settings row.
     */
    private final ReaderSettingsRepository repository;

    /**
     * Clock stamping each change.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param repository settings repository
     * @param clock      application clock
     */
    public DefaultReaderSettingsService(ReaderSettingsRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /**
     * Reads the single row in a read-only transaction.
     *
     * @return current settings
     */
    @Override
    @Transactional(readOnly = true)
    public ReaderSettingsResponse getSettings() {
        return ReaderSettingsResponse.from(loadSettings());
    }

    /**
     * Updates the single row in place; dirty checking writes it when the transaction commits.
     *
     * @param request validated new settings
     * @return settings after the change
     */
    @Override
    @Transactional
    public ReaderSettingsResponse updateSettings(UpdateReaderSettingsRequest request) {
        ReaderSettings settings = loadSettings();
        settings.update(request.fontTier(), clock.instant());
        return ReaderSettingsResponse.from(settings);
    }

    /**
     * Loads the single settings row, which the V1 migration inserts.
     *
     * @return settings entity
     * @throws IllegalStateException when the row is missing, which means a broken database
     */
    private ReaderSettings loadSettings() {
        return repository.findById(ReaderSettings.SINGLETON_ID)
            .orElseThrow(() -> new IllegalStateException("reader_settings row is missing"));
    }
}
