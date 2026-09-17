package io.github.thomashtn.bookreader.catalogue.client;

/**
 * Catalogue entry offering an EPUB.
 *
 * @param id      entry identifier, the URL of its page on the site
 * @param title   title
 * @param author  author in reading order, empty when unknown
 * @param summary plain-text summary, empty when absent
 */
public record OpdsEntry(String id, String title, String author, String summary) {
}
