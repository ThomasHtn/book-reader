package io.github.thomashtn.bookreader.book.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link BookSource} under its external value, the one the {@code book.source} check constraint lists.
 */
@Converter
public class BookSourceConverter implements AttributeConverter<BookSource, String> {

    /**
     * Writes the external value rather than the constant name, so renaming a constant never touches the data.
     *
     * @param source book source
     * @return {@code catalogue} or {@code upload}
     */
    @Override
    public String convertToDatabaseColumn(BookSource source) {
        return source.value();
    }

    /**
     * Reads the external value, failing loudly on an unknown one instead of guessing a source.
     *
     * @param value column value
     * @return matching source
     * @throws IllegalArgumentException when the value is unknown
     */
    @Override
    public BookSource convertToEntityAttribute(String value) {
        return BookSource.fromValue(value);
    }
}
