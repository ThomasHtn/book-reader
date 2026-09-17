package io.github.thomashtn.bookreader.catalogue.config;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

/**
 * Connection settings of the Ebooks libres et gratuits OPDS catalogue.
 *
 * @param baseUrl        site root, such as {@code https://www.ebooksgratuits.com/}
 * @param connectTimeout TCP connection timeout
 * @param readTimeout    longest wait between two reads of a response
 * @param maxEpubSize    largest EPUB accepted, aligned with the upload limit
 */
@Validated
@ConfigurationProperties("app.catalogue")
public record CatalogueProperties(
    @NotNull URI baseUrl,
    @NotNull Duration connectTimeout,
    @NotNull Duration readTimeout,
    @NotNull DataSize maxEpubSize
) {
}
