package io.github.thomashtn.bookreader;

import io.github.thomashtn.bookreader.catalogue.config.CatalogueProperties;
import io.github.thomashtn.bookreader.shared.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Entry point of the book reader backend.
 */
@SpringBootApplication
@EnableConfigurationProperties({ApplicationProperties.class, CatalogueProperties.class})
public class BookReaderApplication {

    /**
     * Starts the Spring Boot application.
     *
     * @param args command-line arguments passed to Spring Boot
     */
    public static void main(String[] args) {
        SpringApplication.run(BookReaderApplication.class, args);
    }
}
