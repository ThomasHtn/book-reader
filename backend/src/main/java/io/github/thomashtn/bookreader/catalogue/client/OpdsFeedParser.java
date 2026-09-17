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

    private static final String ACQUISITION = "http://opds-spec.org/acquisition";

    private static final String EPUB = "application/epub+zip";

    private static final Pattern LINE_BREAK = Pattern.compile("<br\\s*/?>", Pattern.CASE_INSENSITIVE);

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

    private static boolean offersEpub(Element entry) {
        return entry.children().stream().anyMatch(child -> "link".equals(child.tagName())
            && ACQUISITION.equals(child.attr("rel"))
            && EPUB.equals(child.attr("type")));
    }

    /**
     * Turns "Hugo, Victor" into "Victor Hugo"; other forms are kept.
     */
    private static String author(Element entry) {
        Element author = child(entry, "author");
        String name = author == null ? "" : childText(author, "name");
        String[] parts = name.split(",");
        return parts.length == 2 ? (parts[1].strip() + " " + parts[0].strip()).strip() : name;
    }

    private static String summary(Element entry) {
        String content = childText(entry, "content");
        return Jsoup.parse(LINE_BREAK.matcher(content).replaceAll(" ")).text();
    }

    private static String childText(Element parent, String tag) {
        Element child = child(parent, tag);
        return child == null ? "" : child.text().strip();
    }

    private static Element child(Element parent, String tag) {
        return parent.children().stream().filter(child -> tag.equals(child.tagName())).findFirst().orElse(null);
    }
}
