package io.github.thomashtn.bookreader.conversion;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Resolves relative hrefs found in EPUB documents to archive paths.
 */
final class EpubPaths {

    private EpubPaths() {
    }

    /**
     * Returns the directory part of an archive path, with its trailing slash.
     *
     * @param path archive path
     * @return directory, empty at the archive root
     */
    static String directoryOf(String path) {
        return path.substring(0, path.lastIndexOf('/') + 1);
    }

    /**
     * Resolves an href against a directory, dropping its fragment and percent-encoding.
     *
     * @param directory directory of the referencing document
     * @param href      relative reference, possibly with a fragment
     * @return normalized archive path
     */
    static String resolve(String directory, String href) {
        Deque<String> segments = new ArrayDeque<>();
        for (String segment : (directory + decode(withoutFragment(href))).split("/")) {
            if ("..".equals(segment)) {
                segments.pollLast();
            } else if (!segment.isEmpty() && !".".equals(segment)) {
                segments.addLast(segment);
            }
        }
        return String.join("/", segments);
    }

    /**
     * Returns the fragment of an href.
     *
     * @param href reference
     * @return fragment without {@code #}, or {@code null}
     */
    static String fragmentOf(String href) {
        int hash = href.indexOf('#');
        return hash < 0 || hash == href.length() - 1 ? null : href.substring(hash + 1);
    }

    private static String withoutFragment(String href) {
        int hash = href.indexOf('#');
        return hash < 0 ? href : href.substring(0, hash);
    }

    private static String decode(String href) {
        return URLDecoder.decode(href.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
