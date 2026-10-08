package io.github.thomashtn.bookreader.conversion;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;

/**
 * Parses the XML and XHTML documents of an EPUB archive.
 */
final class EpubXml {

    /**
     * Prevents instantiation of this static helper.
     */
    private EpubXml() {
    }

    /**
     * Parses a document leniently, detecting its declared encoding.
     *
     * <p>Content documents are XHTML, so the XML parser keeps their structure as written: the HTML
     * parser turns a self-closing {@code <a id="x"/>} into a link wrapping every following paragraph.
     * jsoup never resolves DTDs, so a document cannot reach local files.</p>
     *
     * @param content document bytes
     * @return parsed document
     */
    static Document parse(byte[] content) {
        try {
            return Jsoup.parse(new ByteArrayInputStream(content), null, "", Parser.xmlParser());
        } catch (IOException exception) {
            // Unreachable: the stream reads from memory.
            throw new UncheckedIOException(exception);
        }
    }
}
