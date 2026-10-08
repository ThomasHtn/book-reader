package io.github.thomashtn.bookreader.catalogue.client;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;

/**
 * Reads the entries of an OPDS Atom feed; jsoup never resolves DTDs, so the feed cannot reach local files.
 */
public final class OpdsFeedParser {

    /**
     * Link relation of a downloadable file in OPDS.
     */
    private static final String ACQUISITION = "http://opds-spec.org/acquisition";

    /**
     * Media type of the only format the converter reads.
     */
    private static final String EPUB = "application/epub+zip";

    /**
     * Line break inside the escaped HTML summary, turned into a space so words do not stick together.
     */
    private static final Pattern LINE_BREAK = Pattern.compile("<br\\s*/?>", Pattern.CASE_INSENSITIVE);

    /**
     * Prevents instantiation of this static helper.
     */
    private OpdsFeedParser() {
    }

    /**
     * Parses a feed, keeping only entries that offer an EPUB.
     *
     * @param xml Atom feed
     * @return entries in feed order
     */
    public static List<OpdsEntry> parse(String xml) {
        Document feed = Jsoup.parse(xml, "", Parser.xmlParser());
        List<OpdsEntry> entries = new ArrayList<>();
        for (Element entry : feed.getElementsByTag("entry")) {
            if (offersEpub(entry)) {
                entries.add(new OpdsEntry(
                    childText(entry, "id"),
                    childText(entry, "title"),
                    author(entry),
                    summary(entry)
                ));
            }
        }
        return entries;
    }

    /**
     * Tells whether an entry links to an EPUB download.
     *
     * @param entry Atom entry
     * @return {@code true} when an EPUB acquisition link is present
     */
    private static boolean offersEpub(Element entry) {
        return entry.children().stream().anyMatch(child -> "link".equals(child.tagName())
            && ACQUISITION.equals(child.attr("rel"))
            && EPUB.equals(child.attr("type")));
    }

    /**
     * Turns "Hugo, Victor" into "Victor Hugo"; other forms are kept.
     *
     * @param entry Atom entry
     * @return author in reading order, empty when absent
     */
    private static String author(Element entry) {
        Element author = child(entry, "author");
        String name = author == null ? "" : childText(author, "name");
        String[] parts = name.split(",");
        return parts.length == 2 ? (parts[1].strip() + " " + parts[0].strip()).strip() : name;
    }

    /**
     * Returns the summary as plain text; the feed carries it as escaped HTML.
     *
     * @param entry Atom entry
     * @return summary, empty when absent
     */
    private static String summary(Element entry) {
        String content = childText(entry, "content");
        return Jsoup.parse(LINE_BREAK.matcher(content).replaceAll(" ")).text();
    }

    /**
     * Returns the trimmed text of a direct child element.
     *
     * @param parent parent element
     * @param tag    child tag name
     * @return text, empty when the child is absent
     */
    private static String childText(Element parent, String tag) {
        Element child = child(parent, tag);
        return child == null ? "" : child.text().strip();
    }

    /**
     * Returns a direct child element; a descendant search would pick nested elements of the same name.
     *
     * @param parent parent element
     * @param tag    child tag name
     * @return first matching child, {@code null} when absent
     */
    private static Element child(Element parent, String tag) {
        return parent.children().stream().filter(child -> tag.equals(child.tagName())).findFirst().orElse(null);
    }
}
