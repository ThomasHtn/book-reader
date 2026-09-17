package io.github.thomashtn.bookreader.catalogue.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies how an OPDS search feed becomes catalogue entries, on responses recorded from the real site.
 */
class OpdsFeedParserTest {

    @Test
    @DisplayName("Reads identifier, title, author in reading order and plain-text summary of each entry")
    void parsesRecordedSearch() {
        List<OpdsEntry> entries = OpdsFeedParser.parse(OpdsFixtures.recorded("search-miserables.xml"));

        assertThat(entries).extracting(OpdsEntry::id).containsExactly(
            "https://www.ebooksgratuits.com/details.php?book=726",
            "https://www.ebooksgratuits.com/details.php?book=727",
            "https://www.ebooksgratuits.com/details.php?book=728",
            "https://www.ebooksgratuits.com/details.php?book=729",
            "https://www.ebooksgratuits.com/details.php?book=730"
        );
        OpdsEntry first = entries.getFirst();
        assertThat(first.title()).isEqualTo("Les Misérables - Tome I - Fantine");
        assertThat(first.author()).isEqualTo("Victor Hugo");
        assertThat(first.summary()).startsWith("Oeuvre immense, joyau du patrimoine").doesNotContain("<br", "\n");
    }

    @Test
    @DisplayName("Hides entries without EPUB, which cannot be activated")
    void skipsEntriesWithoutEpub() {
        assertThat(OpdsFeedParser.parse(OpdsFixtures.recorded("search-miserables.xml")))
            .extracting(OpdsEntry::id)
            .doesNotContain("https://www.ebooksgratuits.com/details.php?book=123");
    }

    @Test
    @DisplayName("Returns no entry for an empty result")
    void parsesEmptySearch() {
        assertThat(OpdsFeedParser.parse(OpdsFixtures.recorded("search-empty.xml"))).isEmpty();
    }

    @Test
    @DisplayName("Keeps a single-name author and tolerates a missing author or summary")
    void toleratesSparseEntries() {
        String feed = """
            <feed xmlns="http://www.w3.org/2005/Atom">
              <author><name>Ebooks libres et gratuits</name></author>
              <entry>
                <title>Le Grand Meaulnes</title>
                <id>https://www.ebooksgratuits.com/details.php?book=5</id>
                <author><name>Alain-Fournier</name></author>
                <link type="application/epub+zip" href="x" rel="http://opds-spec.org/acquisition"/>
              </entry>
              <entry>
                <title>Anonyme</title>
                <id>https://www.ebooksgratuits.com/details.php?book=6</id>
                <link type="application/epub+zip" href="y" rel="http://opds-spec.org/acquisition"/>
              </entry>
            </feed>
            """;

        assertThat(OpdsFeedParser.parse(feed)).containsExactly(
            new OpdsEntry(
                "https://www.ebooksgratuits.com/details.php?book=5", "Le Grand Meaulnes", "Alain-Fournier", ""
            ),
            new OpdsEntry("https://www.ebooksgratuits.com/details.php?book=6", "Anonyme", "", "")
        );
    }
}
