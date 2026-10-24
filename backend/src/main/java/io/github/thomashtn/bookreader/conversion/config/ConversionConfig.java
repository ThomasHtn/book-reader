package io.github.thomashtn.bookreader.conversion.config;

import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.EpubLimits;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

/**
 * Exposes the pure EPUB converter as a bean.
 */
@Configuration
public class ConversionConfig {

    /**
     * Creates the converter, its limits derived from the configured EPUB size limit.
     *
     * <p>The property is read by key because the conversion package sits below the catalogue one.</p>
     *
     * @param maxEpubSize largest EPUB accepted, from {@code app.catalogue.max-epub-size}
     * @return EPUB converter
     */
    @Bean
    EpubConverter epubConverter(@Value("${app.catalogue.max-epub-size}") DataSize maxEpubSize) {
        return new EpubConverter(EpubLimits.forMaxEpubSize(maxEpubSize.toBytes()));
    }
}
