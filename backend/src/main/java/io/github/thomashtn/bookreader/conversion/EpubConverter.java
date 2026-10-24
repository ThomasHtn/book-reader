package io.github.thomashtn.bookreader.conversion;

import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.conversion.model.Block;
import io.github.thomashtn.bookreader.conversion.model.ConvertedBook;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jsoup.nodes.Element;

/**
 * Converts an EPUB into the internal format, purely in memory: no I/O, no database, no clock.
 */
public class EpubConverter {

    /**
     * Archive entry listing encrypted resources: DRM, or only obfuscated fonts.
     */
    private static final String ENCRYPTION = "META-INF/encryption.xml";

    /**
     * Font obfuscation methods (IDPF and Adobe): they hide fonts the reader never uses, not the text.
     */
    private static final Set<String> FONT_OBFUSCATION = Set.of(
        "http://www.idpf.org/2008/embedding",
        "http://ns.adobe.com/pdf/enc#RC"
    );

    /**
     * Decompression guards.
     */
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
        if (entries.containsKey(ENCRYPTION) && encryptsMoreThanFonts(entries.get(ENCRYPTION))) {
            throw new EpubRejectedException(Reason.ENCRYPTED, "The EPUB declares encrypted resources");
        }
        EpubPackage epubPackage = EpubPackage.parse(entries);

        List<Block> blocks = new ArrayList<>();
        for (String path : epubPackage.readingOrder()) {
            byte[] content = entries.get(path);
            if (content != null) {
                blocks.addAll(BlockExtractor.extract(EpubXml.parse(content), epubPackage.tocTargetsOf(path)));
            }
        }
        if (blocks.isEmpty()) {
            throw new EpubRejectedException(Reason.NO_TEXT, "No readable text in the EPUB");
        }
        // Some EPUBs converted from a PDF hold one paragraph per printed line: rejoin them.
        return new ConvertedBook(epubPackage.title(), epubPackage.author(), LineReflow.reflow(blocks));
    }

    /**
     * Tells whether an encryption.xml protects anything beyond obfuscated fonts, which means DRM.
     *
     * @param encryption content of {@code META-INF/encryption.xml}
     * @return {@code true} when one method is not a font obfuscation
     */
    private static boolean encryptsMoreThanFonts(byte[] encryption) {
        for (Element element : EpubXml.parse(encryption).getAllElements()) {
            boolean method = element.tagName().replaceFirst(".*:", "").equals("EncryptionMethod");
            if (method && !FONT_OBFUSCATION.contains(element.attr("Algorithm"))) {
                return true;
            }
        }
        return false;
    }
}
