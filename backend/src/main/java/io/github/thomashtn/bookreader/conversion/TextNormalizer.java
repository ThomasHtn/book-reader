package io.github.thomashtn.bookreader.conversion;

import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Plain-text rules of a block (specification section 7.3); idempotent.
 */
public final class TextNormalizer {

    /**
     * Runs of ordinary spaces and tabs within a line; no-break spaces are left alone.
     */
    private static final Pattern ORDINARY_SPACES = Pattern.compile("[ \\t\\r\\f]+");

    /**
     * Spaces, no-break ones included, at the start or end of a line.
     */
    private static final Pattern LINE_EDGES = Pattern.compile("^[ \\u00a0\\u202f]+|[ \\u00a0\\u202f]+$");

    /**
     * Ordinary space before French double punctuation, which must not start a line.
     */
    private static final Pattern SPACE_BEFORE_PUNCTUATION = Pattern.compile(" (?=[;:!?»])");

    /**
     * Ordinary space after an opening guillemet, which must not end a line.
     */
    private static final Pattern SPACE_AFTER_GUILLEMET = Pattern.compile("(?<=«) ");

    /**
     * Prevents instantiation of this static helper.
     */
    private TextNormalizer() {
    }

    /**
     * Normalizes a block text: collapses spaces, drops blank lines, applies French no-break spacing.
     *
     * @param text raw text, {@code \n} marking forced line breaks
     * @return normalized text, empty when nothing readable remains
     */
    public static String normalize(String text) {
        return text.lines()
            .map(line -> ORDINARY_SPACES.matcher(line).replaceAll(" "))
            .map(line -> LINE_EDGES.matcher(line).replaceAll(""))
            .filter(line -> !line.isEmpty())
            .map(line -> SPACE_BEFORE_PUNCTUATION.matcher(line).replaceAll(" "))
            .map(line -> SPACE_AFTER_GUILLEMET.matcher(line).replaceAll(" "))
            .collect(Collectors.joining("\n"));
    }
}
