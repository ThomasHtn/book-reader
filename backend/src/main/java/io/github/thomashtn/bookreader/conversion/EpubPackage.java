package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

/**
 * What the OPF says about a book: metadata, reading order, skipped documents and table of contents.
 */
final class EpubPackage {

    /**
     * Fixed archive path of the file pointing at the OPF.
     */
    private static final String CONTAINER = "META-INF/container.xml";

    /**
     * Guide reference types whose document is front or back matter rather than reading text.
     */
    private static final Set<String> SKIPPED_GUIDE_TYPES = Set.of(
        "bibliography", "copyright-page", "cover", "title-page", "toc"
    );

    /**
     * Title shown when the OPF has none; French, like everything the reader displays.
     */
    private static final String UNKNOWN_TITLE = "Titre inconnu";

    /**
     * Author shown when the OPF has none; French, like everything the reader displays.
     */
    private static final String UNKNOWN_AUTHOR = "Auteur inconnu";

    /**
     * Book title.
     */
    private final String title;

    /**
     * First author.
     */
    private final String author;

    /**
     * Content documents to convert, in spine order.
     */
    private final List<String> readingOrder;

    /**
     * Places the table of contents points at, used to recognise chapter headings.
     */
    private final EpubTableOfContents tableOfContents;

    /**
     * Creates the package description.
     *
     * @param title           book title
     * @param author          first author
     * @param readingOrder    content documents in spine order
     * @param tableOfContents table of contents targets
     */
    private EpubPackage(
        String title, String author, List<String> readingOrder, EpubTableOfContents tableOfContents
    ) {
        this.title = title;
        this.author = author;
        this.readingOrder = readingOrder;
        this.tableOfContents = tableOfContents;
    }

    /**
     * Reads {@code container.xml}, the OPF and the table of contents.
     *
     * @param entries archive entries
     * @return package description
     * @throws EpubRejectedException when the container or the OPF is missing
     */
    static EpubPackage parse(Map<String, byte[]> entries) {
        Document container = EpubXml.parse(require(entries, CONTAINER));
        Element rootfile = container.selectFirst("rootfile[full-path]");
        if (rootfile == null) {
            throw new EpubRejectedException(Reason.INVALID, "No rootfile in container.xml");
        }
        String opfPath = rootfile.attr("full-path");
        Document opf = EpubXml.parse(require(entries, opfPath));
        String opfDirectory = EpubPaths.directoryOf(opfPath);

        Map<String, Element> manifest = new HashMap<>();
        for (Element item : opf.getElementsByTag("item")) {
            manifest.put(item.attr("id"), item);
        }

        EpubTableOfContents tableOfContents = EpubTableOfContents.read(entries, manifest.values(), opfDirectory);
        // Some generators list the navigation document in the spine, but it only repeats the titles.
        Set<String> skipped = skippedGuidePaths(opf, opfDirectory);
        skipped.addAll(tableOfContents.navigationDocuments());
        List<String> readingOrder = readingOrder(opf, manifest, opfDirectory, skipped);

        return new EpubPackage(
            metadata(opf, "title", UNKNOWN_TITLE),
            metadata(opf, "creator", UNKNOWN_AUTHOR),
            readingOrder,
            tableOfContents
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
        return tableOfContents.targetsOf(path);
    }

    /**
     * Returns the documents the guide marks as cover, title page, table of contents or copyright page.
     *
     * @param opf          parsed OPF
     * @param opfDirectory directory of the OPF, against which guide hrefs resolve
     * @return mutable set of archive paths
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
     * Returns the linear spine documents that are not skipped, in spine order.
     *
     * @param opf          parsed OPF
     * @param manifest     manifest items keyed by id
     * @param opfDirectory directory of the OPF, against which item hrefs resolve
     * @param skipped      archive paths left out of the reading text
     * @return archive paths to convert
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

    /**
     * Returns an archive entry the EPUB cannot do without.
     *
     * @param entries archive entries
     * @param path    archive path
     * @return entry content
     * @throws EpubRejectedException when the entry is missing
     */
    private static byte[] require(Map<String, byte[]> entries, String path) {
        byte[] content = entries.get(path);
        if (content == null) {
            throw new EpubRejectedException(Reason.INVALID, "Missing " + path);
        }
        return content;
    }

    /**
     * Returns the first non-blank Dublin Core element with this local name, whatever its namespace prefix.
     *
     * @param opf       parsed OPF
     * @param localName element name without prefix, such as {@code title}
     * @param fallback  value used when the OPF has none
     * @return normalized metadata
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
