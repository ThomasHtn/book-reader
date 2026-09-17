package io.github.thomashtn.bookreader.conversion;

/**
 * Decompression guards against oversized or malicious archives.
 *
 * @param maxEntryBytes largest decompressed size of one archive entry
 * @param maxTotalBytes largest decompressed size of the whole archive
 */
public record EpubLimits(long maxEntryBytes, long maxTotalBytes) {

    /**
     * Production limits: 20 MB per file, 100 MB decompressed (specification section 7.4).
     */
    public static final EpubLimits DEFAULT = new EpubLimits(20L * 1024 * 1024, 100L * 1024 * 1024);
}
