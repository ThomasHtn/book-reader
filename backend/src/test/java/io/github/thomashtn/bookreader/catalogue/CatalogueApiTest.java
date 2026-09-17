package io.github.thomashtn.bookreader.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.catalogue.client.OpdsFixtures;
import io.github.thomashtn.bookreader.conversion.EpubFixtures;
import io.github.thomashtn.bookreader.shared.config.AdminApiKeyFilter;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import mockwebserver3.Dispatcher;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import mockwebserver3.RecordedRequest;
import okio.Buffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies catalogue search and activation (specification sections 7.2, 9 and 10) against a fake site.
 */
class CatalogueApiTest extends PostgreSqlIntegrationTest {

    private static final String FANTINE = "https://www.ebooksgratuits.com/details.php?book=726";

    private static final MockWebServer CATALOGUE = new MockWebServer();

    private static final AtomicBoolean SITE_DOWN = new AtomicBoolean();

    private static final AtomicInteger DOWNLOADS = new AtomicInteger();

    static {
        CATALOGUE.setDispatcher(new FakeCatalogue());
        try {
            CATALOGUE.start();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookRepository repository;

    /**
     * Points the application at the fake catalogue.
     *
     * @param registry Spring dynamic property registry
     */
    @DynamicPropertySource
    static void configureCatalogue(DynamicPropertyRegistry registry) {
        registry.add("app.catalogue.base-url", () -> CATALOGUE.url("/").toString());
        registry.add("app.catalogue.read-timeout", () -> "PT2S");
    }

    @BeforeEach
    void resetState() {
        repository.deleteAll();
        SITE_DOWN.set(false);
        DOWNLOADS.set(0);
    }

    @Test
    @DisplayName("Lists catalogue entries with their import state")
    void searchesCatalogue() throws Exception {
        search("Misérables")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(5)))
            .andExpect(jsonPath("$[0].entryId").value(FANTINE))
            .andExpect(jsonPath("$[0].title").value("Les Misérables - Tome I - Fantine"))
            .andExpect(jsonPath("$[0].author").value("Victor Hugo"))
            .andExpect(jsonPath("$[0].summary").exists())
            .andExpect(jsonPath("$[0].state").value("not-imported"));
    }

    @Test
    @DisplayName("Downloads, converts and activates a catalogue entry, then shows it as active")
    void activatesEntry() throws Exception {
        String id = importEntry(FANTINE)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.source").value("catalogue"))
            .andExpect(jsonPath("$.sourceUrl").value(FANTINE))
            .andExpect(jsonPath("$.title").value("Les Misérables - Tome I - Fantine"))
            .andExpect(jsonPath("$.active").value(true))
            .andReturn().getResponse().getContentAsString()
            .transform(json -> JsonPath.read(json, "$.id"));

        mockMvc.perform(get("/api/books/{id}", id)).andExpect(status().isOk());
        search("miserables").andExpect(jsonPath("$[0].state").value("active"));
        assertDownloads(1);
    }

    @Test
    @DisplayName("Reactivates a withdrawn entry without downloading or converting it again")
    void reactivatesWithdrawnEntry() throws Exception {
        String id = JsonPath.read(importEntry(FANTINE).andReturn().getResponse().getContentAsString(), "$.id");
        mockMvc.perform(patch("/api/admin/books/{id}", id)
                .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\": false}"))
            .andExpect(status().isOk());
        search("miserables").andExpect(jsonPath("$[0].state").value("withdrawn"));

        importEntry(FANTINE)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.active").value(true));

        search("miserables").andExpect(jsonPath("$[0].state").value("active"));
        assertDownloads(1);
    }

    @Test
    @DisplayName("Answers 503 when the catalogue site is unreachable")
    void reportsUnavailableSite() throws Exception {
        SITE_DOWN.set(true);

        search("hugo")
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code").value("CATALOGUE_UNAVAILABLE"));
        importEntry(FANTINE)
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code").value("CATALOGUE_UNAVAILABLE"));
        mockMvc.perform(get("/api/books")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Refuses an entry identifier that is not a catalogue book page")
    void rejectsForeignEntryId() throws Exception {
        importEntry("https://evil.example/steal?book=1")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_ARGUMENT"));
        importEntry("").andExpect(status().isBadRequest());
        assertDownloads(0);
    }

    @Test
    @DisplayName("Refuses a blank search")
    void rejectsBlankSearch() throws Exception {
        search("  ").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Keeps the catalogue behind the administrator key")
    void requiresAdminKey() throws Exception {
        mockMvc.perform(get("/api/admin/catalogue").param("query", "hugo")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/books/from-catalogue")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"entryId\": \"" + FANTINE + "\"}"))
            .andExpect(status().isUnauthorized());
    }

    private ResultActions search(String query) throws Exception {
        return mockMvc.perform(get("/api/admin/catalogue")
            .param("query", query)
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY));
    }

    private ResultActions importEntry(String entryId) throws Exception {
        return mockMvc.perform(post("/api/admin/books/from-catalogue")
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"entryId\": \"" + entryId + "\"}"));
    }

    private static void assertDownloads(int expected) {
        assertThat(DOWNLOADS.get()).isEqualTo(expected);
    }

    /**
     * Serves recorded search responses and the Atlantis fixture as the EPUB of every book.
     */
    private static final class FakeCatalogue extends Dispatcher {

        @Override
        public MockResponse dispatch(RecordedRequest request) {
            if (SITE_DOWN.get()) {
                return new MockResponse.Builder().code(503).build();
            }
            String path = request.getUrl().encodedPath();
            if ("/opds/feed.php".equals(path)) {
                return new MockResponse.Builder()
                    .addHeader("Content-Type", "application/atom+xml; charset=UTF-8")
                    .body(OpdsFixtures.recorded("search-miserables.xml"))
                    .build();
            }
            if ("/newsendbook.php".equals(path)) {
                DOWNLOADS.incrementAndGet();
                return new MockResponse.Builder().body(new Buffer().write(EpubFixtures.epub("atlantis"))).build();
            }
            return new MockResponse.Builder().code(404).build();
        }
    }
}
