package io.github.thomashtn.bookreader.catalogue.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies the query sent to the catalogue, which ignores title accents but not query accents.
 */
class CatalogueQueryTest {

    @Test
    @DisplayName("Strips accents and surrounding spaces, keeping case and ligatures")
    void stripsAccents() {
        assertThat(CatalogueQuery.normalize("  Les Misérables à Noël, garçon  "))
            .isEqualTo("Les Miserables a Noel, garcon");
        assertThat(CatalogueQuery.normalize("Œuvres")).isEqualTo("Œuvres");
    }
}
