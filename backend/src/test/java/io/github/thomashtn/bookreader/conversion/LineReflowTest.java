package io.github.thomashtn.bookreader.conversion;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.bookreader.conversion.model.Block;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies how a book cut at every printed line gets its paragraphs back (specification section 7.3).
 */
class LineReflowTest {

    /**
     * A full printed line: sixty characters, no sentence end.
     */
    private static final String FULL = "Il marchait le long de la rivière en regardant les bateaux";

    /**
     * Last line of a paragraph: short, ending a sentence.
     */
    private static final String LAST = "et rentra chez lui.";

    /**
     * Builds a book cut line by line: paragraphs of three full lines and a short last one.
     *
     * @param paragraphs number of paragraphs
     * @return one block per line
     */
    private static List<Block> lineBroken(int paragraphs) {
        List<Block> blocks = new ArrayList<>();
        for (int index = 0; index < paragraphs; index++) {
            blocks.add(Block.paragraph(FULL));
            blocks.add(Block.paragraph(FULL));
            blocks.add(Block.paragraph(FULL));
            blocks.add(Block.paragraph(LAST));
        }
        return blocks;
    }

    @Test
    @DisplayName("Rejoins the lines of each paragraph with a space, a short line ending a sentence closing it")
    void rejoinsLines() {
        List<Block> reflowed = LineReflow.reflow(lineBroken(20));

        assertThat(reflowed).hasSize(20)
            .allSatisfy(block -> assertThat(block).isEqualTo(
                Block.paragraph(FULL + " " + FULL + " " + FULL + " " + LAST)
            ));
    }

    @Test
    @DisplayName("Keeps headings in place, each closing the paragraph before it")
    void keepsHeadings() {
        List<Block> blocks = lineBroken(20);
        blocks.add(2, Block.heading("Chapitre II"));

        List<Block> reflowed = LineReflow.reflow(blocks);

        assertThat(reflowed.subList(0, 3)).containsExactly(
            Block.paragraph(FULL + " " + FULL),
            Block.heading("Chapitre II"),
            Block.paragraph(FULL + " " + LAST)
        );
    }

    @Test
    @DisplayName("Does not close a paragraph on a full line that happens to end a sentence")
    void fullLineEndingSentence() {
        List<Block> blocks = lineBroken(20);
        blocks.set(1, Block.paragraph("Il marchait le long de la rivière en regardant les eaux."));

        assertThat(LineReflow.reflow(blocks).getFirst().text())
            .startsWith(FULL + " Il marchait le long de la rivière en regardant les eaux. " + FULL);
    }

    @Test
    @DisplayName("Drops a line-end hyphen inside a word of the book, keeps it in a compound word")
    void handlesHyphens() {
        List<Block> blocks = lineBroken(20);
        blocks.set(0, Block.paragraph("Madame Pelletier di-"));
        blocks.set(1, Block.paragraph("rigeait le personnel et dirigeait aussi les comptes de la maison lui-"));
        blocks.set(2, Block.paragraph("même, sans jamais se plaindre de rien ni de personne au monde"));

        assertThat(LineReflow.reflow(blocks).getFirst().text()).startsWith(
            "Madame Pelletier dirigeait le personnel et dirigeait aussi les comptes de la maison lui-même, sans"
        );
    }

    @Test
    @DisplayName("Returns any other book untouched")
    void leavesRealParagraphs() {
        List<Block> blocks = IntStream.range(0, 60)
            .mapToObj(index -> Block.paragraph("Une phrase entière, qui finit bien."))
            .toList();

        assertThat(LineReflow.reflow(blocks)).isSameAs(blocks);
    }

    @Test
    @DisplayName("Leaves a book too short to judge untouched")
    void leavesShortBooks() {
        List<Block> blocks = lineBroken(10);

        assertThat(LineReflow.reflow(blocks)).isSameAs(blocks);
    }
}
