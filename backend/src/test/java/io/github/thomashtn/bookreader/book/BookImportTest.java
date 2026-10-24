package io.github.thomashtn.bookreader.book;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.book.service.BookAlreadyImportedException;
import io.github.thomashtn.bookreader.book.service.BookService;
import io.github.thomashtn.bookreader.conversion.EpubFixtures;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Specifies how a catalogue import tells a duplicate entry from any other database failure.
 */
class BookImportTest extends PostgreSqlIntegrationTest {

    /**
     * Catalogue entry identifier used by the tests.
     */
    private static final String ENTRY = "https://www.ebooksgratuits.com/details.php?book=726";

    /**
     * Service under test.
     */
    @Autowired
    private BookService service;

    /**
     * Repository emptied before each test.
     */
    @Autowired
    private BookRepository repository;

    @BeforeEach
    void emptyLibrary() {
        repository.deleteAll();
    }

    @Test
    @DisplayName("Reports an entry imported twice as already imported")
    void reportsDuplicateEntry() {
        byte[] epub = EpubFixtures.epub("atlantis");
        service.importCatalogueEpub(epub, ENTRY);

        assertThatThrownBy(() -> service.importCatalogueEpub(epub, ENTRY))
            .isInstanceOf(BookAlreadyImportedException.class);
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Lets any other integrity violation propagate instead of calling it a duplicate")
    void propagatesOtherIntegrityViolations() {
        // A catalogue book without a source identifier breaks the table's check constraint, not the unique one.
        assertThatThrownBy(() -> service.importCatalogueEpub(EpubFixtures.epub("atlantis"), null))
            .isInstanceOf(DataIntegrityViolationException.class)
            .isNotInstanceOf(BookAlreadyImportedException.class);
    }
}
