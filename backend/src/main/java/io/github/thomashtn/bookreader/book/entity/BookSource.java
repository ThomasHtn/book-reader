package io.github.thomashtn.bookreader.book.entity;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Where a book comes from.
 */
public enum BookSource {

    /**
     * Ebooks libres et gratuits OPDS catalogue.
     */
    CATALOGUE("catalogue"),

    /**
     * EPUB uploaded from the backoffice.
     */
    UPLOAD("upload");

    /**
     * Value shared by the API and the {@code book.source} column.
     */
    private final String value;

    /**
     * Binds a source to its external value.
     *
     * @param value value shared by the API and the database
     */
    BookSource(String value) {
        this.value = value;
    }

    /**
     * Returns the source stored under an external value.
     *
     * @param value {@code catalogue} or {@code upload}
     * @return matching source
     * @throws IllegalArgumentException when the value is unknown, which means a corrupted row
     */
    public static BookSource fromValue(String value) {
        for (BookSource source : values()) {
            if (source.value.equals(value)) {
                return source;
            }
        }
        throw new IllegalArgumentException("Unknown book source: " + value);
    }

    /**
     * Returns the value shared by the API and the database.
     *
     * @return {@code catalogue} or {@code upload}
     */
    @JsonValue
    public String value() {
        return value;
    }
}
