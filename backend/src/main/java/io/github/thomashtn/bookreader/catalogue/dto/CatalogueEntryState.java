package io.github.thomashtn.bookreader.catalogue.dto;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Whether a catalogue entry is already in the library.
 */
public enum CatalogueEntryState {

    /**
     * Never imported: "Activer" downloads and converts it.
     */
    NOT_IMPORTED("not-imported"),

    /**
     * Imported and visible to the reader: "Déjà active".
     */
    ACTIVE("active"),

    /**
     * Imported then withdrawn: "Activer" reactivates it without conversion.
     */
    WITHDRAWN("withdrawn");

    private final String value;

    CatalogueEntryState(String value) {
        this.value = value;
    }

    /**
     * Returns the value used in JSON.
     *
     * @return external value
     */
    @JsonValue
    public String value() {
        return value;
    }
}
