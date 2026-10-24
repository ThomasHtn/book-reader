package io.github.thomashtn.bookreader.book.entity;

/**
 * Projection the book lists return: the entity does not implement it, so Spring Data selects only these columns.
 */
public interface BookListItem extends BookSummary {}
