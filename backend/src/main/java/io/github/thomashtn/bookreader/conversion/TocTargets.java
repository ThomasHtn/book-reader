package io.github.thomashtn.bookreader.conversion;

import java.util.Set;

/**
 * Places a table of contents points at inside one content document.
 *
 * @param documentStart whether an entry targets the document itself
 * @param anchors       element ids targeted by an entry
 */
record TocTargets(boolean documentStart, Set<String> anchors) {

    /**
     * Targets of a document no table of contents entry points at.
     */
    static final TocTargets NONE = new TocTargets(false, Set.of());

    /**
     * Copies the anchors so the record stays immutable.
     */
    TocTargets {
        anchors = Set.copyOf(anchors);
    }
}
