package io.github.thomashtn.bookreader.conversion;

/**
 * Decompression guards against oversized or malicious archives.
 *
 * @param maxEntryBytes largest decompressed size of one archive entry
 * @param maxTotalBytes largest decompressed size of the whole archive
 * @param maxEntries    largest number of entries in the archive
 */
public record EpubLimits(long maxEntryBytes, long maxTotalBytes, int maxEntries) {

    /**
     * How many times the EPUB size limit the decompressed archive may reach (specification section 7.4).
     */
    private static final long TOTAL_SIZE_FACTOR = 5;

    /**
     * Most entries an archive may hold, far above any real EPUB.
     */
    private static final int MAX_ENTRIES = 10_000;

    /**
     * Derives every guard from the one configured EPUB size limit, so the limits have a single source.
     *
     * @param maxEpubBytes largest EPUB accepted, also the largest decompressed file
     * @return limits for the converter
     */
    public static EpubLimits forMaxEpubSize(long maxEpubBytes) {
        return new EpubLimits(maxEpubBytes, maxEpubBytes * TOTAL_SIZE_FACTOR, MAX_ENTRIES);
    }
}
