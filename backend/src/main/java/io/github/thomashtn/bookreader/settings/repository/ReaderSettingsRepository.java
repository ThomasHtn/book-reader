package io.github.thomashtn.bookreader.settings.repository;

import io.github.thomashtn.bookreader.settings.entity.ReaderSettings;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Access to the single reader settings row.
 */
public interface ReaderSettingsRepository extends JpaRepository<ReaderSettings, Short> {
}
