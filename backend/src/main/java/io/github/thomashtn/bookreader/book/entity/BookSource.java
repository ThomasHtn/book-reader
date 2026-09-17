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

    private final String value;

    BookSource(String value) {
        this.value = value;
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
