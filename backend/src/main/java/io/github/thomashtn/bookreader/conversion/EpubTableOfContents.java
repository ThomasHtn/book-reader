package io.github.thomashtn.bookreader.conversion;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

/**
 * Where the tables of contents of an EPUB point: the EPUB 2 NCX and the EPUB 3 navigation document.
 *
 * <p>A targeted place starts a chapter, so the block found there becomes a heading even when the
 * EPUB styles it as a plain paragraph.</p>
 *
 * @param targets             places each content document is targeted at, keyed by archive path
 * @param navigationDocuments EPUB 3 navigation documents, which are not part of the reading text
 */
record EpubTableOfContents(Map<String, TocTargets> targets, Set<String> navigationDocuments) {

    /**
     * Media type identifying the NCX in the manifest.
     */
    private static final String NCX_MEDIA_TYPE = "application/x-dtbncx+xml";

    /**
     * Manifest property identifying the EPUB 3 navigation document.
     */
    private static final String NAV_PROPERTY = "nav";

    /**
     * Copies both collections so the record stays immutable.
     */
    EpubTableOfContents {
        targets = Map.copyOf(targets);
        navigationDocuments = Set.copyOf(navigationDocuments);
    }

    /**
     * Reads every table of contents declared in the manifest; a missing file is ignored.
     *
     * @param entries      archive entries
     * @param items        manifest items
     * @param opfDirectory directory of the OPF, against which item hrefs resolve
     * @return targets and navigation documents, possibly empty
     */
    static EpubTableOfContents read(Map<String, byte[]> entries, Iterable<Element> items, String opfDirectory) {
        Map<String, TocTargets> targets = new HashMap<>();
        Set<String> navigationDocuments = new HashSet<>();
        for (Element item : items) {
            String itemPath = EpubPaths.resolve(opfDirectory, item.attr("href"));
            if (!entries.containsKey(itemPath)) {
                continue;
            }
            if (NCX_MEDIA_TYPE.equals(item.attr("media-type"))) {
                Document ncx = EpubXml.parse(entries.get(itemPath));
                collectTargets(targets, itemPath, ncx.select("content[src]"), "src");
            } else if (hasProperty(item, NAV_PROPERTY)) {
                navigationDocuments.add(itemPath);
                Document nav = EpubXml.parse(entries.get(itemPath));
                collectTargets(targets, itemPath, nav.select("nav[epub:type~=\\btoc\\b] a[href]"), "href");
            }
        }
        return new EpubTableOfContents(targets, navigationDocuments);
    }

    /**
     * Returns where the table of contents points inside a document.
     *
     * @param path archive path of a content document
     * @return targets, {@link TocTargets#NONE} when nothing points at it
     */
    TocTargets targetsOf(String path) {
        return targets.getOrDefault(path, TocTargets.NONE);
    }

    /**
     * Tells whether a manifest item declares a property among its space-separated {@code properties}.
     *
     * @param item     manifest item
     * @param property property name
     * @return {@code true} when declared
     */
    private static boolean hasProperty(Element item, String property) {
        return List.of(item.attr("properties").split("\\s+")).contains(property);
    }

    /**
     * Records the documents and anchors a list of table of contents links points at.
     *
     * @param targets   targets collected so far, completed in place
     * @param tocPath   archive path of the table of contents, against which links resolve
     * @param links     link elements
     * @param attribute attribute holding the link target
     */
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
}
