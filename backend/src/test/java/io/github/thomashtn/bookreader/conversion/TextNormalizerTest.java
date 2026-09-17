package io.github.thomashtn.bookreader.conversion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Specifies the plain-text rules of a block (specification section 7.3).
 */
class TextNormalizerTest {

    @Test
    @DisplayName("Collapses ordinary whitespace but keeps line breaks")
    void collapsesWhitespace() {
        assertThat(TextNormalizer.normalize("  Il  était\tune\n fois \n\n  la fin  "))
            .isEqualTo("Il était une\nfois\nla fin");
    }

    @Test
    @DisplayName("Keeps existing no-break spaces inside a line and drops lines holding only spaces")
    void keepsNoBreakSpaces() {
        assertThat(TextNormalizer.normalize("M. Myriel ;\n \nfin"))
            .isEqualTo("M. Myriel ;\nfin");
    }

    @Test
    @DisplayName("Turns an ordinary space before ; : ! ? » and after « into a no-break space")
    void appliesFrenchSpacing() {
        assertThat(TextNormalizer.normalize("« Oui » ; non : peut-être ! quoi ?"))
            .isEqualTo("« Oui » ; non : peut-être ! quoi ?");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Il est 10:30.", "Voir http://example.org/a?b", "Quoi?!"})
    @DisplayName("Never inserts a space where the text has none")
    void neverInsertsSpaces(String text) {
        assertThat(TextNormalizer.normalize(text)).isEqualTo(text);
    }

    @ParameterizedTest
    @ValueSource(strings = {"« Oui » ; non !", "  a\n\n b  ", "x : y"})
    @DisplayName("Is idempotent")
    void isIdempotent(String text) {
        String once = TextNormalizer.normalize(text);
        assertThat(TextNormalizer.normalize(once)).isEqualTo(once);
    }
}
