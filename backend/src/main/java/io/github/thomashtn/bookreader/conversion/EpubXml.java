package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.jsoup.select.NodeTraversor;
import org.jsoup.select.NodeVisitor;

/**
 * Parses the XML and XHTML documents of an EPUB archive.
 */
final class EpubXml {

    /**
     * Deepest element nesting accepted, far above real XHTML; the converter walks the tree recursively.
     */
    static final int MAX_DEPTH = 200;

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
     * @throws EpubRejectedException when the elements are nested deeper than {@link #MAX_DEPTH}
     */
    static Document parse(byte[] content) {
        try {
            Document document = Jsoup.parse(new ByteArrayInputStream(content), null, "", Parser.xmlParser());
            checkDepth(document);
            return document;
        } catch (IOException exception) {
            // Unreachable: the stream reads from memory.
            throw new UncheckedIOException(exception);
        }
    }

    /**
     * Rejects a document nested deeper than {@link #MAX_DEPTH}, walking it without recursion.
     *
     * @param document parsed document
     */
    private static void checkDepth(Document document) {
        NodeTraversor.traverse((NodeVisitor) (node, depth) -> {
            if (depth > MAX_DEPTH) {
                throw new EpubRejectedException(Reason.INVALID, "XML nested deeper than " + MAX_DEPTH);
            }
        }, document);
    }
}
