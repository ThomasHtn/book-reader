package io.github.thomashtn.bookreader.settings.entity;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Reader colour theme, identified by the value sent to the frontend as {@code data-theme}.
 */
public enum Theme {

    /**
     * Black text on off-white paper, the default.
     */
    DARK_ON_LIGHT("dark-on-light"),

    /**
     * White text on black.
     */
    LIGHT_ON_DARK("light-on-dark"),

    /**
     * Yellow text on black.
     */
    YELLOW_ON_BLACK("yellow-on-black");

    /**
     * Value shared by the API, the database and the frontend attribute.
     */
    private final String value;

    Theme(String value) {
        this.value = value;
    }

    /**
     * Returns the external value of this theme.
     *
     * @return value such as {@code dark-on-light}
     */
    @JsonValue
    public String value() {
        return value;
    }

    /**
     * Resolves a theme from its external value.
     *
     * @param value external value
     * @return matching theme
     * @throws IllegalArgumentException when no theme has this value
     */
    public static Theme fromValue(String value) {
        for (Theme theme : values()) {
            if (theme.value.equals(value)) {
                return theme;
            }
        }
        throw new IllegalArgumentException("Unknown theme: " + value);
    }
}
