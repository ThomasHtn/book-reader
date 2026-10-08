package io.github.thomashtn.bookreader.book;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.thomashtn.bookreader.book.entity.BookSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies how a stored book source is read back.
 */
class BookSourceTest {

    @Test
    @DisplayName("Reads each source back from its external value")
    void readsKnownValues() {
        for (BookSource source : BookSource.values()) {
            assertThat(BookSource.fromValue(source.value())).isEqualTo(source);
        }
    }

    @Test
    @DisplayName("Refuses an unknown value instead of guessing a source")
    void refusesUnknownValue() {
        assertThatThrownBy(() -> BookSource.fromValue("scan")).isInstanceOf(IllegalArgumentException.class);
    }
}
