package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Decompresses an EPUB in memory, counting real decompressed bytes rather than trusting declared sizes.
 */
final class EpubArchive {

    /**
     * Read buffer size; the limits are checked once per buffer.
     */
    private static final int BUFFER_SIZE = 64 * 1024;

    /**
     * Prevents instantiation of this static helper.
     */
    private EpubArchive() {
    }

    /**
     * Reads every file entry of the archive.
     *
     * @param epub   archive bytes
     * @param limits decompression guards
     * @return entry contents keyed by archive path
     * @throws EpubRejectedException when the archive is invalid, unsafe, too large or has too many entries
     */
    static Map<String, byte[]> read(byte[] epub, EpubLimits limits) {
        Map<String, byte[]> entries = new HashMap<>();
        long total = 0;
        int count = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(epub))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++count > limits.maxEntries()) {
                    throw new EpubRejectedException(Reason.TOO_LARGE, "Archive holds too many entries");
                }
                String name = entry.getName();
                if (escapesRoot(name)) {
                    throw new EpubRejectedException(Reason.INVALID, "Unsafe entry path: " + name);
                }
                if (entry.isDirectory()) {
                    continue;
                }
                byte[] content = readEntry(zip, limits.maxEntryBytes(), name);
                total += content.length;
                if (total > limits.maxTotalBytes()) {
                    throw new EpubRejectedException(Reason.TOO_LARGE, "Archive exceeds the decompressed limit");
                }
                entries.put(name, content);
            }
        } catch (IOException exception) {
            throw new EpubRejectedException(Reason.INVALID, "Unreadable ZIP archive: " + exception.getMessage());
        }
        return entries;
    }

    /**
     * Reads one entry, failing as soon as it grows past the per-file limit.
     *
     * @param zip      archive positioned on the entry
     * @param maxBytes per-file limit
     * @param name     entry name, for the log detail
     * @return decompressed content
     * @throws IOException when the archive is corrupted
     */
    private static byte[] readEntry(ZipInputStream zip, long maxBytes, String name) throws IOException {
        ByteArrayOutputStream content = new ByteArrayOutputStream();
        byte[] buffer = new byte[BUFFER_SIZE];
        int read;
        while ((read = zip.read(buffer)) != -1) {
            if (content.size() + (long) read > maxBytes) {
                throw new EpubRejectedException(Reason.TOO_LARGE, "Entry exceeds the per-file limit: " + name);
            }
            content.write(buffer, 0, read);
        }
        return content.toByteArray();
    }

    /**
     * Tells whether an entry name points outside the archive root: absolute, or with a {@code ..} segment.
     *
     * @param name entry name as stored in the archive
     * @return {@code true} for an unsafe name
     */
    private static boolean escapesRoot(String name) {
        return name.startsWith("/") || name.startsWith("\\") || List.of(name.split("[/\\\\]")).contains("..");
    }
}
