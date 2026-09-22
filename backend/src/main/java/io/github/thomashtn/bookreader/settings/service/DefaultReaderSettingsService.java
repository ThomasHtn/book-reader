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

    private final ReaderSettingsRepository repository;

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

    @Override
    @Transactional(readOnly = true)
    public ReaderSettingsResponse getSettings() {
        return ReaderSettingsResponse.from(loadSettings());
    }

    @Override
    @Transactional
    public ReaderSettingsResponse updateSettings(UpdateReaderSettingsRequest request) {
        ReaderSettings settings = loadSettings();
        settings.update(request.fontTier(), clock.instant());
        return ReaderSettingsResponse.from(settings);
    }

    /**
     * Loads the single settings row, which V1 migration guarantees.
     */
    private ReaderSettings loadSettings() {
        return repository.findById(ReaderSettings.SINGLETON_ID)
            .orElseThrow(() -> new IllegalStateException("reader_settings row is missing"));
    }
}
