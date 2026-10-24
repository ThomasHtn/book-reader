package io.github.thomashtn.bookreader.conversion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies how EPUB hrefs resolve to archive paths.
 */
class EpubPathsTest {

    @Test
    @DisplayName("Decodes percent-encoding and climbs parent segments")
    void decodesAndNormalizes() {
        assertThat(EpubPaths.resolve("Ops/text/", "../Chapitre%20un.xhtml#note")).isEqualTo("Ops/Chapitre un.xhtml");
    }

    @Test
    @DisplayName("Keeps an href whose percent sign encodes nothing, instead of failing the import")
    void keepsMalformedPercentEncoding() {
        assertThat(EpubPaths.resolve("Ops/", "100%.xhtml")).isEqualTo("Ops/100%.xhtml");
    }
}
