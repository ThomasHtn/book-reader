package io.github.thomashtn.bookreader.conversion;

import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Plain-text rules of a block (specification section 7.3); idempotent.
 */
public final class TextNormalizer {

    private static final Pattern ORDINARY_SPACES = Pattern.compile("[ \\t\\r\\f]+");

    private static final Pattern LINE_EDGES = Pattern.compile("^[ \\u00a0\\u202f]+|[ \\u00a0\\u202f]+$");

    private static final Pattern SPACE_BEFORE_PUNCTUATION = Pattern.compile(" (?=[;:!?»])");

    private static final Pattern SPACE_AFTER_GUILLEMET = Pattern.compile("(?<=«) ");

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
