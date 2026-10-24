package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.model.Block;
import io.github.thomashtn.bookreader.conversion.model.BlockKind;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rejoins the paragraphs of an EPUB cut at every printed line, as some conversions from a PDF ship them
 * (specification section 7.3); any other book is returned untouched.
 */
public final class LineReflow {

    /**
     * Share of paragraphs ending a sentence below which a book counts as cut line by line; real books
     * stay above 90 %.
     */
    static final double LINE_BROKEN_BELOW = 0.7;

    /**
     * Fewest paragraphs a book needs before its shape is judged.
     */
    static final int MIN_PARAGRAPHS = 50;

    /**
     * A line ending a sentence ends its paragraph when it is shorter than this share of a full line.
     */
    static final double SHORT_LINE = 0.85;

    /**
     * Percentile of line lengths standing for a full printed line.
     */
    private static final double FULL_LINE_PERCENTILE = 0.9;

    /**
     * Last character of a line that ends a sentence, closing quotes and brackets included.
     */
    private static final Pattern SENTENCE_END = Pattern.compile("[.!?…:»)\\]\"”]$");

    /**
     * A line ending on a hyphen right after a letter, capturing the word fragment before it.
     */
    private static final Pattern HYPHEN_AT_END = Pattern.compile("(\\p{L}+)-$");

    /**
     * Characters at the end of a paragraph searched for a hyphenated word fragment, longer than any word.
     */
    private static final int TAIL_LENGTH = 64;

    /**
     * First word of a line.
     */
    private static final Pattern FIRST_WORD = Pattern.compile("^\\p{L}+");

    /**
     * A word, for the vocabulary that tells a line-end hyphenation from a compound word.
     */
    private static final Pattern WORD = Pattern.compile("\\p{L}+");

    /**
     * Prevents instantiation of this static helper.
     */
    private LineReflow() {
    }

    /**
     * Rejoins the lines of a book cut line by line into paragraphs, headings kept where they are.
     *
     * @param blocks blocks in reading order
     * @return the same blocks when the book is not cut line by line, else its rebuilt paragraphs
     */
    public static List<Block> reflow(List<Block> blocks) {
        List<String> lines = blocks.stream()
            .filter(block -> block.kind() == BlockKind.PARAGRAPH)
            .map(Block::text)
            .toList();
        if (lines.size() < MIN_PARAGRAPHS || shareEndingSentence(lines) >= LINE_BROKEN_BELOW) {
            return blocks;
        }
        int fullLine = fullLineLength(lines);
        Set<String> vocabulary = vocabulary(lines);
        List<Block> result = new ArrayList<>();
        StringBuilder paragraph = new StringBuilder();
        for (Block block : blocks) {
            if (block.kind() == BlockKind.HEADING) {
                flush(paragraph, result);
                result.add(block);
                continue;
            }
            append(paragraph, block.text(), vocabulary);
            if (endsParagraph(block.text(), fullLine)) {
                flush(paragraph, result);
            }
        }
        flush(paragraph, result);
        return result;
    }

    /**
     * Measures the share of lines that end a sentence.
     *
     * @param lines paragraph texts
     * @return share between 0 and 1
     */
    private static double shareEndingSentence(List<String> lines) {
        long ending = lines.stream().filter(line -> SENTENCE_END.matcher(line).find()).count();
        return (double) ending / lines.size();
    }

    /**
     * Takes a high percentile of line lengths as the length of a full printed line.
     *
     * @param lines paragraph texts
     * @return length in characters
     */
    private static int fullLineLength(List<String> lines) {
        int[] lengths = lines.stream().mapToInt(String::length).sorted().toArray();
        return lengths[(int) Math.floor((lengths.length - 1) * FULL_LINE_PERCENTILE)];
    }

    /**
     * Collects the words of the book in lower case, to recognise a word cut by a line-end hyphen.
     *
     * @param lines paragraph texts
     * @return every word met
     */
    private static Set<String> vocabulary(List<String> lines) {
        Set<String> words = new HashSet<>();
        for (String line : lines) {
            Matcher matcher = WORD.matcher(line);
            while (matcher.find()) {
                words.add(matcher.group().toLowerCase(Locale.ROOT));
            }
        }
        return words;
    }

    /**
     * Tells whether a line closes its paragraph: it ends a sentence and stops well short of a full line.
     *
     * @param line     line text
     * @param fullLine length of a full line
     * @return {@code true} when the next line starts a new paragraph
     */
    private static boolean endsParagraph(String line, int fullLine) {
        return SENTENCE_END.matcher(line).find() && line.length() < fullLine * SHORT_LINE;
    }

    /**
     * Adds a line to the paragraph being rebuilt. A line-end hyphen is dropped when the joined word is
     * a word of the book ("di-" and "rigeait"), kept otherwise ("lui-" and "même").
     *
     * @param paragraph  paragraph being rebuilt
     * @param line       next line
     * @param vocabulary words of the book
     */
    private static void append(StringBuilder paragraph, String line, Set<String> vocabulary) {
        if (paragraph.isEmpty()) {
            paragraph.append(line);
            return;
        }
        // Only the tail can end on a hyphen: no need to scan the whole paragraph again.
        Matcher fragment = HYPHEN_AT_END.matcher(paragraph.subSequence(
            Math.max(0, paragraph.length() - TAIL_LENGTH), paragraph.length()
        ));
        Matcher next = FIRST_WORD.matcher(line);
        if (fragment.find() && next.find()) {
            String joined = (fragment.group(1) + next.group()).toLowerCase(Locale.ROOT);
            if (vocabulary.contains(joined)) {
                paragraph.setLength(paragraph.length() - 1);
            }
            paragraph.append(line);
            return;
        }
        paragraph.append(' ').append(line);
    }

    /**
     * Closes the paragraph being rebuilt, if any.
     *
     * @param paragraph paragraph being rebuilt, emptied
     * @param result    blocks rebuilt so far
     */
    private static void flush(StringBuilder paragraph, List<Block> result) {
        if (!paragraph.isEmpty()) {
            result.add(Block.paragraph(paragraph.toString()));
            paragraph.setLength(0);
        }
    }
}
