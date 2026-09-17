package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;

/**
 * What the OPF says about a book: metadata, reading order, skipped documents and table of contents.
 */
final class EpubPackage {

    private static final String CONTAINER = "META-INF/container.xml";

    private static final Set<String> SKIPPED_GUIDE_TYPES = Set.of(
        "bibliography", "copyright-page", "cover", "title-page", "toc"
    );

    private static final String NCX_MEDIA_TYPE = "application/x-dtbncx+xml";

    private final String title;

    private final String author;

    private final List<String> readingOrder;

    private final Map<String, TocTargets> tocTargets;

    private EpubPackage(String title, String author, List<String> readingOrder, Map<String, TocTargets> tocTargets) {
        this.title = title;
        this.author = author;
        this.readingOrder = readingOrder;
        this.tocTargets = tocTargets;
    }

    /**
     * Reads {@code container.xml}, the OPF and the table of contents.
     *
     * @param entries archive entries
     * @return package description
     * @throws EpubRejectedException when the container or the OPF is missing
     */
    static EpubPackage parse(Map<String, byte[]> entries) {
        Document container = parseXml(require(entries, CONTAINER));
        Element rootfile = container.selectFirst("rootfile[full-path]");
        if (rootfile == null) {
            throw new EpubRejectedException(Reason.INVALID, "No rootfile in container.xml");
        }
        String opfPath = rootfile.attr("full-path");
        Document opf = parseXml(require(entries, opfPath));
        String opfDirectory = EpubPaths.directoryOf(opfPath);

        Map<String, Element> manifest = new HashMap<>();
        for (Element item : opf.getElementsByTag("item")) {
            manifest.put(item.attr("id"), item);
        }

        Set<String> skipped = skippedGuidePaths(opf, opfDirectory);
        Map<String, TocTargets> tocTargets = readTableOfContents(entries, manifest.values(), opfDirectory, skipped);
        List<String> readingOrder = readingOrder(opf, manifest, opfDirectory, skipped);

        return new EpubPackage(
            metadata(opf, "title", "Titre inconnu"),
            metadata(opf, "creator", "Auteur inconnu"),
            readingOrder,
            tocTargets
        );
    }

    /**
     * Returns the title.
     *
     * @return title from the OPF
     */
    String title() {
        return title;
    }

    /**
     * Returns the author.
     *
     * @return first creator from the OPF
     */
    String author() {
        return author;
    }

    /**
     * Returns the content documents to read, in spine order.
     *
     * @return archive paths
     */
    List<String> readingOrder() {
        return readingOrder;
    }

    /**
     * Returns where the table of contents points inside a document.
     *
     * @param path archive path of a content document
     * @return targets, possibly none
     */
    TocTargets tocTargetsOf(String path) {
        return tocTargets.getOrDefault(path, TocTargets.NONE);
    }

    /**
     * Parses an XML or XHTML document leniently, detecting its declared encoding.
     *
     * <p>Content documents are XHTML, so the XML parser keeps their structure as written: the HTML
     * parser turns a self-closing {@code <a id="x"/>} into a link wrapping every following paragraph.</p>
     *
     * @param content document bytes
     * @return parsed document
     */
    static Document parseXml(byte[] content) {
        try {
            return Jsoup.parse(new ByteArrayInputStream(content), null, "", Parser.xmlParser());
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    /**
     * Returns the documents the guide marks as cover, title page, table of contents or copyright page.
     */
    private static Set<String> skippedGuidePaths(Document opf, String opfDirectory) {
        Set<String> skipped = new HashSet<>();
        for (Element reference : opf.getElementsByTag("reference")) {
            if (SKIPPED_GUIDE_TYPES.contains(reference.attr("type"))) {
                skipped.add(EpubPaths.resolve(opfDirectory, reference.attr("href")));
            }
        }
        return skipped;
    }

    /**
     * Reads the NCX and the EPUB 3 navigation document; the latter is also added to the skipped documents.
     */
    private static Map<String, TocTargets> readTableOfContents(
        Map<String, byte[]> entries, Iterable<Element> items, String opfDirectory, Set<String> skipped
    ) {
        Map<String, TocTargets> tocTargets = new HashMap<>();
        for (Element item : items) {
            String itemPath = EpubPaths.resolve(opfDirectory, item.attr("href"));
            if (!entries.containsKey(itemPath)) {
                continue;
            }
            if (NCX_MEDIA_TYPE.equals(item.attr("media-type"))) {
                collectTargets(tocTargets, itemPath, parseXml(entries.get(itemPath)).select("content[src]"), "src");
            } else if (hasProperty(item, "nav")) {
                skipped.add(itemPath);
                Document nav = parseXml(entries.get(itemPath));
                collectTargets(tocTargets, itemPath, nav.select("nav[epub:type~=\\btoc\\b] a[href]"), "href");
            }
        }
        return tocTargets;
    }

    /**
     * Returns the linear spine documents that are not skipped, in spine order.
     */
    private static List<String> readingOrder(
        Document opf, Map<String, Element> manifest, String opfDirectory, Set<String> skipped
    ) {
        List<String> readingOrder = new ArrayList<>();
        for (Element itemref : opf.getElementsByTag("itemref")) {
            Element item = manifest.get(itemref.attr("idref"));
            if (item == null || "no".equals(itemref.attr("linear"))) {
                continue;
            }
            String path = EpubPaths.resolve(opfDirectory, item.attr("href"));
            if (!skipped.contains(path)) {
                readingOrder.add(path);
            }
        }
        return List.copyOf(readingOrder);
    }

    private static byte[] require(Map<String, byte[]> entries, String path) {
        byte[] content = entries.get(path);
        if (content == null) {
            throw new EpubRejectedException(Reason.INVALID, "Missing " + path);
        }
        return content;
    }

    private static boolean hasProperty(Element item, String property) {
        return List.of(item.attr("properties").split("\\s+")).contains(property);
    }

    private static void collectTargets(
        Map<String, TocTargets> targets, String tocPath, List<Element> links, String attribute
    ) {
        Map<String, Set<String>> anchors = new HashMap<>();
        Set<String> documentStarts = new HashSet<>();
        for (Element link : links) {
            String href = link.attr(attribute);
            String path = EpubPaths.resolve(EpubPaths.directoryOf(tocPath), href);
            String fragment = EpubPaths.fragmentOf(href);
            if (fragment == null) {
                documentStarts.add(path);
            } else {
                anchors.computeIfAbsent(path, key -> new HashSet<>()).add(fragment);
            }
        }
        Set<String> paths = new HashSet<>(documentStarts);
        paths.addAll(anchors.keySet());
        for (String path : paths) {
            targets.put(path, new TocTargets(documentStarts.contains(path), anchors.getOrDefault(path, Set.of())));
        }
    }

    /**
     * Returns the first Dublin Core element with this local name, whatever its namespace prefix.
     */
    private static String metadata(Document opf, String localName, String fallback) {
        for (Element element : opf.getAllElements()) {
            String tag = element.tagName();
            if (tag.equals(localName) || tag.endsWith(":" + localName)) {
                String text = TextNormalizer.normalize(element.text());
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }
        return fallback;
    }
}
