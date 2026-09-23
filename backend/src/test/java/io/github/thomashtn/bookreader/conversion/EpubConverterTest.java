package io.github.thomashtn.bookreader.conversion;

import static io.github.thomashtn.bookreader.conversion.model.Block.heading;
import static io.github.thomashtn.bookreader.conversion.model.Block.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Specifies the EPUB to internal format conversion (specification sections 7.3 and 7.4).
 */
class EpubConverterTest {

    private static final String NBSP = " ";

    private final EpubConverter converter = new EpubConverter(EpubLimits.DEFAULT);

    @Nested
    @DisplayName("Atlantis Word Processor export")
    class Atlantis {

        private final ConvertedBook book = converter.convert(EpubFixtures.epub("atlantis"));

        @Test
        @DisplayName("Takes title and author from the OPF")
        void readsMetadata() {
            assertThat(book.title()).isEqualTo("Les Misérables - Tome I - Fantine");
            assertThat(book.author()).isEqualTo("Victor Hugo");
        }

        @Test
        @DisplayName("Cuts title and author to the length the book table stores")
        void truncatesLongMetadata() {
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            String opf = new String(entries.get("Ops/content.opf"), StandardCharsets.UTF_8)
                .replace("Les Misérables - Tome I - Fantine", "T".repeat(600))
                .replace(">Victor Hugo<", ">" + "A".repeat(600) + "<");
            entries.put("Ops/content.opf", opf.getBytes(StandardCharsets.UTF_8));

            ConvertedBook longBook = converter.convert(EpubFixtures.zip(entries));

            assertThat(longBook.title()).isEqualTo("T".repeat(ConvertedBook.MAX_METADATA_LENGTH));
            assertThat(longBook.author()).isEqualTo("A".repeat(ConvertedBook.MAX_METADATA_LENGTH));
        }

        @Test
        @DisplayName("Promotes table of contents targets to headings, drops notes, notes document, cover, empty blocks")
        void extractsBlocks() {
            assertThat(book.blocks()).containsExactly(
                paragraph("Victor Hugo"),
                paragraph("LES MISÉRABLES\nTome I – FANTINE"),
                heading("Livre premier – Un juste"),
                heading("Chapitre I – Monsieur Myriel"),
                paragraph("En 1815, M." + NBSP + "Charles-François-Bienvenu Myriel était évêque de Digne. "
                    + "C’était un vieillard d’environ soixante-quinze ans" + NBSP
                    + "; il occupait le siège de Digne depuis 1806."),
                paragraph("Que se passa-t-il ensuite dans la destinée de M." + NBSP + "Myriel" + NBSP
                    + "? Avec ces quinze cents francs, ces deux vieilles femmes et ce vieillard vivaient.")
            );
        }
    }

    @Nested
    @DisplayName("Feedbooks export")
    class Feedbooks {

        private final ConvertedBook book = converter.convert(EpubFixtures.epub("feedbooks"));

        @Test
        @DisplayName("Keeps real headings, collapses wrapped lines, drops tables, note calls and guide pages")
        void extractsBlocks() {
            assertThat(book.title()).isEqualTo("Le Horla");
            assertThat(book.blocks()).containsExactly(
                heading("Chapitre 2 Amour"),
                paragraph("… Je viens de lire dans un fait divers de journal un drame de passion. "
                    + "Il l’a tuée, puis il s’est tué, donc il l’aimait. Qu’importent Il et Elle" + NBSP
                    + "? Leur amour seul m’importe" + NBSP + ";"),
                paragraph("J’aime la chasse avec passion" + NBSP + "; et la bête saignante me crispe le cœur"
                    + NBSP + "!")
            );
        }
    }

    @Nested
    @DisplayName("EPUB 3 with a navigation document")
    class Epub3 {

        private final ConvertedBook book = converter.convert(EpubFixtures.epub("epub3"));

        @Test
        @DisplayName("Handles mixed containers, lists, quotes, footnotes, figures, self-closing anchors, spacing")
        void extractsBlocks() {
            assertThat(book.author()).isEqualTo("Charles Baudelaire");
            assertThat(book.blocks()).containsExactly(
                paragraph("Cette préface est volontairement bien trop longue pour être prise pour un titre" + NBSP
                    + ": elle continue encore et encore, bien au-delà de cent cinquante caractères, afin que "
                    + "la table des matières ne la transforme pas en titre de chapitre."),
                heading("L’Albatros"),
                paragraph("Souvent, pour s’amuser, les hommes d’équipage\n"
                    + "Prennent des albatros, vastes oiseaux des mers,"),
                paragraph("Qui suivent, indolents compagnons de voyage,"),
                paragraph("Le navire glissant sur les gouffres amers."),
                paragraph("À la très chère, à la très belle"),
                paragraph("Premier élément"),
                paragraph("Second élément"),
                heading("Spleen"),
                paragraph("Quand le ciel bas et lourd"),
                paragraph("Pèse comme un couvercle"),
                paragraph("«" + NBSP + "Voilà" + NBSP + "», dit-il" + NBSP + ": «" + NBSP + "c’est tout" + NBSP
                    + "!" + NBSP + "»")
            );
        }
    }

    @Nested
    @DisplayName("Rejections")
    class Rejections {

        @Test
        @DisplayName("Rejects an encrypted EPUB")
        void rejectsEncrypted() {
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            entries.put("META-INF/encryption.xml", "<encryption/>".getBytes(StandardCharsets.UTF_8));

            assertRejected(EpubFixtures.zip(entries), Reason.ENCRYPTED);
        }

        @Test
        @DisplayName("Rejects an EPUB without any text")
        void rejectsWithoutText() {
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            entries.keySet().removeIf(path -> path.matches("Ops/00[234]\\.html"));

            assertRejected(EpubFixtures.zip(entries), Reason.NO_TEXT);
        }

        @Test
        @DisplayName("Rejects a file that is not a ZIP archive")
        void rejectsNonZip() {
            assertRejected("plain text".getBytes(StandardCharsets.UTF_8), Reason.INVALID);
        }

        @Test
        @DisplayName("Rejects an archive without container.xml")
        void rejectsMissingContainer() {
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            entries.remove("META-INF/container.xml");

            assertRejected(EpubFixtures.zip(entries), Reason.INVALID);
        }

        @Test
        @DisplayName("Rejects entries escaping the archive root")
        void rejectsPathTraversal() {
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            entries.put("../evil.html", new byte[1]);
            assertRejected(EpubFixtures.zip(entries), Reason.INVALID);

            Map<String, byte[]> absolute = EpubFixtures.entries("atlantis");
            absolute.put("/etc/evil.html", new byte[1]);
            assertRejected(EpubFixtures.zip(absolute), Reason.INVALID);
        }

        @Test
        @DisplayName("Rejects a single entry above the per-file limit")
        void rejectsLargeEntry() {
            EpubConverter strict = new EpubConverter(new EpubLimits(1_000, 1_000_000));
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            entries.put("Ops/images/big.jpg", new byte[1_001]);

            assertThatThrownBy(() -> strict.convert(EpubFixtures.zip(entries)))
                .isInstanceOfSatisfying(EpubRejectedException.class,
                    exception -> assertThat(exception.reason()).isEqualTo(Reason.TOO_LARGE));
        }

        @Test
        @DisplayName("Rejects an archive above the total decompressed limit")
        void rejectsLargeArchive() {
            EpubConverter strict = new EpubConverter(new EpubLimits(1_000_000, 5_000));
            Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
            for (int index = 0; index < 6; index++) {
                entries.put("Ops/images/part" + index + ".jpg", new byte[1_000]);
            }

            assertThatThrownBy(() -> strict.convert(EpubFixtures.zip(entries)))
                .isInstanceOfSatisfying(EpubRejectedException.class,
                    exception -> assertThat(exception.reason()).isEqualTo(Reason.TOO_LARGE));
        }

        private void assertRejected(byte[] epub, Reason reason) {
            assertThatThrownBy(() -> converter.convert(epub))
                .isInstanceOfSatisfying(EpubRejectedException.class,
                    exception -> assertThat(exception.reason()).isEqualTo(reason));
        }
    }
}
