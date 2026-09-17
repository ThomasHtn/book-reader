package io.github.thomashtn.bookreader.conversion.config;

import io.github.thomashtn.bookreader.conversion.EpubConverter;
import io.github.thomashtn.bookreader.conversion.EpubLimits;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Exposes the pure EPUB converter as a bean.
 */
@Configuration
public class ConversionConfig {

    /**
     * Creates the converter with production limits.
     *
     * @return EPUB converter
     */
    @Bean
    EpubConverter epubConverter() {
        return new EpubConverter(EpubLimits.DEFAULT);
    }
}
