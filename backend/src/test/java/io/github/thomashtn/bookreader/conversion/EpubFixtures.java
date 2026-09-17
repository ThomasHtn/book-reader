package io.github.thomashtn.bookreader.conversion;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Builds EPUB archives from the unzipped fixture trees under {@code src/test/resources/epub}.
 */
public final class EpubFixtures {

    private EpubFixtures() {
    }

    /**
     * Reads a fixture tree as archive entries, {@code mimetype} first as the EPUB container requires.
     *
     * @param fixture directory name under {@code epub/}
     * @return mutable entries keyed by archive path
     */
    public static Map<String, byte[]> entries(String fixture) {
        try {
            Path root = Path.of(EpubFixtures.class.getResource("/epub/" + fixture).toURI());
            Map<String, byte[]> entries = new LinkedHashMap<>();
            entries.put("mimetype", Files.readAllBytes(root.resolve("mimetype")));
            try (Stream<Path> files = Files.walk(root)) {
                for (Path file : files.filter(Files::isRegularFile).sorted().toList()) {
                    entries.putIfAbsent(root.relativize(file).toString().replace('\\', '/'), Files.readAllBytes(file));
                }
            }
            return entries;
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        } catch (URISyntaxException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /**
     * Zips a fixture tree.
     *
     * @param fixture directory name under {@code epub/}
     * @return EPUB bytes
     */
    public static byte[] epub(String fixture) {
        return zip(entries(fixture));
    }

    /**
     * Zips arbitrary entries, in iteration order.
     *
     * @param entries archive paths and contents
     * @return archive bytes
     */
    public static byte[] zip(Map<String, byte[]> entries) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
                zip.putNextEntry(new ZipEntry(entry.getKey()));
                zip.write(entry.getValue());
                zip.closeEntry();
            }
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
        return bytes.toByteArray();
    }
}
