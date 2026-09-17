package io.github.thomashtn.bookreader.settings.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link Theme} under its external value, so the column reads the same as the API.
 */
@Converter
public class ThemeConverter implements AttributeConverter<Theme, String> {

    @Override
    public String convertToDatabaseColumn(Theme theme) {
        return theme.value();
    }

    @Override
    public Theme convertToEntityAttribute(String value) {
        return Theme.fromValue(value);
    }
}
