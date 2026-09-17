package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.model.Block;
import io.github.thomashtn.bookreader.conversion.model.BlockKind;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

/**
 * Turns one XHTML content document into leaf blocks (specification section 7.4, steps 3 and 4).
 */
final class BlockExtractor {

    /**
     * Longest paragraph a table of contents entry may promote to a heading.
     */
    static final int MAX_PROMOTED_HEADING_LENGTH = 150;

    private static final Set<String> HEADINGS = Set.of("h1", "h2", "h3", "h4", "h5", "h6");

    private static final Set<String> BLOCKS = Set.of(
        "address", "article", "aside", "blockquote", "body", "center", "dd", "details", "div", "dl", "dt",
        "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main",
        "nav", "ol", "p", "pre", "section", "summary", "table", "ul"
    );

    private static final Set<String> REMOVED_TAGS = Set.of(
        "audio", "figure", "head", "iframe", "img", "math", "nav", "object", "script", "style", "svg", "table",
        "video"
    );

    private static final Set<String> REMOVED_EPUB_TYPES = Set.of(
        "cover", "endnote", "endnotes", "footnote", "footnotes", "landmarks", "note", "page-list", "rearnote",
        "rearnotes", "titlepage", "toc"
    );

    private static final Pattern NOTE_MARK = Pattern.compile("[\\[({]?(\\d{1,3}|[*†]+|[a-z])[\\])}]?");

    private static final Pattern SOURCE_WHITESPACE = Pattern.compile("[ \\t\\r\\n\\f]+");

    private final TocTargets targets;

    private final List<Block> blocks = new ArrayList<>();

    private final StringBuilder inline = new StringBuilder();

    private boolean headingPending;

    private int noteBodies;

    private BlockExtractor(TocTargets targets) {
        this.targets = targets;
        this.headingPending = targets.documentStart();
    }

    /**
     * Extracts the blocks of a content document.
     *
     * @param document parsed XHTML document
     * @param targets  table of contents targets inside this document
     * @return blocks in document order
     */
    static List<Block> extract(Document document, TocTargets targets) {
        Element body = document.selectFirst("body");
        if (body == null) {
            return List.of();
        }
        BlockExtractor extractor = new BlockExtractor(targets);
        extractor.walk(body);
        extractor.flushInline();
        // Mostly note bodies: a notes document, whose multi-paragraph notes would otherwise leak.
        return extractor.noteBodies > extractor.blocks.size() ? List.of() : extractor.blocks;
    }

    private void walk(Element element) {
        if (isRemoved(element)) {
            return;
        }
        if (HEADINGS.contains(element.normalName())) {
            flushInline();
            markTargets(element);
            emit(BlockKind.HEADING, inlineText(element));
        } else if (!hasBlockChild(element)) {
            flushInline();
            markTargets(element);
            if (startsWithNoteCall(element)) {
                noteBodies++;
            } else {
                emit(BlockKind.PARAGRAPH, inlineText(element));
            }
        } else {
            flushInline();
            markTarget(element);
            walkMixedContent(element);
            flushInline();
        }
    }

    /**
     * Walks a container holding blocks, turning its loose text and inline elements into paragraphs.
     */
    private void walkMixedContent(Element container) {
        for (Node child : container.childNodes()) {
            if (child instanceof TextNode text) {
                inline.append(SOURCE_WHITESPACE.matcher(text.getWholeText()).replaceAll(" "));
            } else if (child instanceof Element element) {
                if (BLOCKS.contains(element.normalName()) || isRemoved(element)) {
                    walk(element);
                } else if ("br".equals(element.normalName())) {
                    inline.append('\n');
                } else {
                    markTargets(element);
                    inline.append(inlineText(element));
                }
            }
        }
    }

    private void flushInline() {
        emit(BlockKind.PARAGRAPH, inline.toString());
        inline.setLength(0);
    }

    private void emit(BlockKind kind, String rawText) {
        String text = TextNormalizer.normalize(rawText);
        if (text.isEmpty()) {
            return;
        }
        BlockKind finalKind = kind;
        if (headingPending && text.length() <= MAX_PROMOTED_HEADING_LENGTH) {
            finalKind = BlockKind.HEADING;
        }
        headingPending = false;
        blocks.add(new Block(finalKind, text));
    }

    private void markTargets(Element element) {
        for (Element descendant : element.getAllElements()) {
            markTarget(descendant);
        }
    }

    private void markTarget(Element element) {
        if (element.hasAttr("id") && targets.anchors().contains(element.id())) {
            headingPending = true;
        }
    }

    private static String inlineText(Element element) {
        StringBuilder text = new StringBuilder();
        appendInlineText(element, text);
        return text.toString();
    }

    private static void appendInlineText(Element element, StringBuilder text) {
        for (Node child : element.childNodes()) {
            if (child instanceof TextNode textNode) {
                text.append(SOURCE_WHITESPACE.matcher(textNode.getWholeText()).replaceAll(" "));
            } else if (child instanceof Element childElement && !isRemoved(childElement)) {
                if ("br".equals(childElement.normalName())) {
                    text.append('\n');
                } else {
                    appendInlineText(childElement, text);
                }
            }
        }
    }

    private static boolean hasBlockChild(Element element) {
        return element.children().stream().anyMatch(child -> BLOCKS.contains(child.normalName()));
    }

    private static boolean isRemoved(Element element) {
        if (REMOVED_TAGS.contains(element.normalName()) || isNoteCall(element)) {
            return true;
        }
        if ("sup".equals(element.normalName()) && element.selectFirst("a[href]") != null) {
            return true;
        }
        for (String type : element.attr("epub:type").split("\\s+")) {
            if (REMOVED_EPUB_TYPES.contains(type)) {
                return true;
            }
        }
        return false;
    }

    /**
     * A note call links to a note: {@code epub:type="noteref"}, or an internal link reading like a note number.
     */
    private static boolean isNoteCall(Element element) {
        if (!"a".equals(element.normalName())) {
            return false;
        }
        if (List.of(element.attr("epub:type").split("\\s+")).contains("noteref")) {
            return true;
        }
        return element.attr("href").contains("#") && NOTE_MARK.matcher(element.text().strip()).matches();
    }

    /**
     * A block opening on a note call is a note body carrying its back link.
     */
    private static boolean startsWithNoteCall(Element element) {
        for (Node child : element.childNodes()) {
            if (child instanceof TextNode text) {
                if (!text.isBlank()) {
                    return false;
                }
            } else if (child instanceof Element childElement) {
                if (isNoteCall(childElement)) {
                    return true;
                }
                if (!childElement.text().isBlank()) {
                    return startsWithNoteCall(childElement);
                }
            }
        }
        return false;
    }
}
