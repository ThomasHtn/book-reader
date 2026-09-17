package io.github.thomashtn.bookreader.catalogue.client;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Search query as the catalogue expects it: the site ignores title accents but not query accents.
 */
public final class CatalogueQuery {

    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");

    private CatalogueQuery() {
    }

    /**
     * Strips accents and surrounding spaces.
     *
     * @param query query typed in the backoffice
     * @return query to send
     */
    public static String normalize(String query) {
        String decomposed = Normalizer.normalize(query, Normalizer.Form.NFD);
        return Normalizer.normalize(COMBINING_MARKS.matcher(decomposed).replaceAll(""), Normalizer.Form.NFC).strip();
    }
}
