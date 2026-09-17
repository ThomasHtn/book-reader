package io.github.thomashtn.bookreader.catalogue.client;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/**
 * Responses recorded from the real catalogue on 2026-09-17, under {@code src/test/resources/opds}.
 */
public final class OpdsFixtures {

    private OpdsFixtures() {
    }

    /**
     * Loads a recorded response.
     *
     * @param name file under {@code opds/}
     * @return feed XML
     */
    public static String recorded(String name) {
        try (InputStream input = OpdsFixtures.class.getResourceAsStream("/opds/" + name)) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
