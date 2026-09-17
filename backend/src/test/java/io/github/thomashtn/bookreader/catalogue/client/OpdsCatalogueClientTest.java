package io.github.thomashtn.bookreader.catalogue.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.thomashtn.bookreader.catalogue.config.CatalogueProperties;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import mockwebserver3.RecordedRequest;
import okio.Buffer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Specifies the HTTP behaviour of the OPDS client against a fake catalogue, never the real site.
 */
class OpdsCatalogueClientTest {

    private MockWebServer server;

    private OpdsCatalogueClient client;

    @BeforeEach
    void startFakeCatalogue() throws IOException {
        server = new MockWebServer();
        server.start();
        client = clientFor(URI.create(server.url("/").toString()), DataSize.ofMegabytes(20));
    }

    @AfterEach
    void stopFakeCatalogue() {
        server.close();
    }

    @Test
    @DisplayName("Relays the search without accents, identifying the application")
    void searchesWithoutAccents() throws InterruptedException {
        server.enqueue(atom(OpdsFixtures.recorded("search-miserables.xml")));

        assertThat(client.search("Les misérables")).hasSize(5);

        RecordedRequest request = server.takeRequest();
        assertThat(request.getUrl().encodedPath()).isEqualTo("/opds/feed.php");
        assertThat(request.getUrl().queryParameter("mode")).isEqualTo("search");
        assertThat(request.getUrl().queryParameter("query")).isEqualTo("Les miserables");
        assertThat(request.getHeaders().get("User-Agent")).startsWith("book-reader/");
    }

    @Test
    @DisplayName("Retries once after a server error")
    void retriesOnce() {
        server.enqueue(new MockResponse.Builder().code(503).build());
        server.enqueue(atom(OpdsFixtures.recorded("search-empty.xml")));

        assertThat(client.search("zzz")).isEmpty();
        assertThat(server.getRequestCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Reports the catalogue unavailable after the retry fails")
    void reportsServerErrors() {
        server.enqueue(new MockResponse.Builder().code(500).build());
        server.enqueue(new MockResponse.Builder().code(502).build());

        assertThatThrownBy(() -> client.search("hugo")).isInstanceOf(CatalogueUnavailableException.class);
        assertThat(server.getRequestCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Reports the catalogue unavailable when it answers too slowly")
    void reportsTimeouts() {
        for (int attempt = 0; attempt < 2; attempt++) {
            server.enqueue(new MockResponse.Builder()
                .body(OpdsFixtures.recorded("search-empty.xml"))
                .headersDelay(2, TimeUnit.SECONDS)
                .build());
        }

        assertThatThrownBy(() -> client.search("hugo")).isInstanceOf(CatalogueUnavailableException.class);
    }

    @Test
    @DisplayName("Reports the catalogue unavailable when nothing listens")
    void reportsUnreachableSite() {
        server.close();

        assertThatThrownBy(() -> client.search("hugo")).isInstanceOf(CatalogueUnavailableException.class);
    }

    @Test
    @DisplayName("Downloads the EPUB of a catalogue book, following the redirection to the static file")
    void downloadsEpub() throws InterruptedException {
        byte[] epub = {80, 75, 3, 4, 1, 2, 3};
        server.enqueue(new MockResponse.Builder().code(302).addHeader("Location", "./epub/hugo_fantine.epub").build());
        server.enqueue(new MockResponse.Builder().body(new Buffer().write(epub)).build());

        assertThat(client.downloadEpub(726)).isEqualTo(epub);

        assertThat(server.takeRequest().getTarget()).isEqualTo("/newsendbook.php?id=726&format=epub");
        assertThat(server.takeRequest().getUrl().encodedPath()).isEqualTo("/epub/hugo_fantine.epub");
    }

    @Test
    @DisplayName("Reports a refused download when the site answers with its HTML warning page instead of the EPUB")
    void reportsRefusedDownload() {
        server.enqueue(new MockResponse.Builder()
            .addHeader("Content-Type", "text/html; charset=utf-8")
            .body("<html><body>ATTENTION : votre adresse IP a été bannie</body></html>")
            .build());

        assertThatThrownBy(() -> client.downloadEpub(726)).isInstanceOf(CatalogueRefusedException.class);
        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Reports a book the catalogue no longer has")
    void reportsMissingBook() {
        server.enqueue(new MockResponse.Builder().code(404).build());

        assertThatThrownBy(() -> client.downloadEpub(999_999)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Refuses an EPUB above the size limit")
    void refusesLargeEpub() {
        OpdsCatalogueClient strict = clientFor(URI.create(server.url("/").toString()), DataSize.ofBytes(1_000));
        server.enqueue(new MockResponse.Builder().body(new Buffer().write(new byte[2_000])).build());

        assertThatThrownBy(() -> strict.downloadEpub(726))
            .isInstanceOfSatisfying(EpubRejectedException.class,
                exception -> assertThat(exception.reason()).isEqualTo(Reason.TOO_LARGE));
    }

    private static OpdsCatalogueClient clientFor(URI baseUrl, DataSize maxEpubSize) {
        CatalogueProperties properties =
            new CatalogueProperties(baseUrl, Duration.ofMillis(500), Duration.ofMillis(500), maxEpubSize);
        return new OpdsCatalogueClient(WebClient.builder(), properties);
    }

    private static MockResponse atom(String body) {
        return new MockResponse.Builder()
            .addHeader("Content-Type", "application/atom+xml; charset=UTF-8")
            .body(body)
            .build();
    }
}
