package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.conversion.model.Block;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Converts an EPUB into the internal format, purely in memory: no I/O, no database, no clock.
 */
public class EpubConverter {

    private static final String ENCRYPTION = "META-INF/encryption.xml";

    private final EpubLimits limits;

    /**
     * Creates a converter.
     *
     * @param limits decompression guards
     */
    public EpubConverter(EpubLimits limits) {
        this.limits = limits;
    }

    /**
     * Converts an EPUB.
     *
     * @param epub archive bytes
     * @return title, author and blocks
     * @throws EpubRejectedException when the EPUB is encrypted, invalid, too large or without text
     */
    public ConvertedBook convert(byte[] epub) {
        Map<String, byte[]> entries = EpubArchive.read(epub, limits);
        if (entries.containsKey(ENCRYPTION)) {
            throw new EpubRejectedException(Reason.ENCRYPTED, "The EPUB declares encrypted resources");
        }
        EpubPackage epubPackage = EpubPackage.parse(entries);

        List<Block> blocks = new ArrayList<>();
        for (String path : epubPackage.readingOrder()) {
            byte[] content = entries.get(path);
            if (content != null) {
                blocks.addAll(BlockExtractor.extract(EpubPackage.parseXml(content), epubPackage.tocTargetsOf(path)));
            }
        }
        if (blocks.isEmpty()) {
            throw new EpubRejectedException(Reason.NO_TEXT, "No readable text in the EPUB");
        }
        return new ConvertedBook(epubPackage.title(), epubPackage.author(), blocks);
    }
}
