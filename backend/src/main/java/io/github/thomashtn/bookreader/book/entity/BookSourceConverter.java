package io.github.thomashtn.bookreader.book.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link BookSource} under its external value.
 */
@Converter
public class BookSourceConverter implements AttributeConverter<BookSource, String> {

    @Override
    public String convertToDatabaseColumn(BookSource source) {
        return source.value();
    }

    @Override
    public BookSource convertToEntityAttribute(String value) {
        return "catalogue".equals(value) ? BookSource.CATALOGUE : BookSource.UPLOAD;
    }
}
