package io.github.thomashtn.bookreader.conversion.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Kind of a block of the internal book format.
 */
public enum BlockKind {

    /**
     * Title of a part or chapter.
     */
    HEADING("heading"),

    /**
     * Body text.
     */
    PARAGRAPH("paragraph");

    private final String value;

    BlockKind(String value) {
        this.value = value;
    }

    /**
     * Returns the value used in JSON.
     *
     * @return {@code heading} or {@code paragraph}
     */
    @JsonValue
    public String value() {
        return value;
    }
}
