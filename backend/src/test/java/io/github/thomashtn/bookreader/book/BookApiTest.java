package io.github.thomashtn.bookreader.book;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.conversion.EpubFixtures;
import io.github.thomashtn.bookreader.shared.config.AdminApiKeyFilter;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the public and administrative books API (specification section 10).
 */
class BookApiTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookRepository repository;

    @BeforeEach
    void emptyLibrary() {
        repository.deleteAll();
    }

    @Test
    @DisplayName("Converts an uploaded EPUB, activates it and serves it to the reader")
    void uploadsAndServesBook() throws Exception {
        String id = upload(EpubFixtures.epub("atlantis"))
            .andExpect(status().isCreated())
            .andExpect(header().string(HttpHeaders.LOCATION, startsWith("/api/books/")))
            .andExpect(jsonPath("$.title").value("Les Misérables - Tome I - Fantine"))
            .andExpect(jsonPath("$.author").value("Victor Hugo"))
            .andExpect(jsonPath("$.source").value("upload"))
            .andExpect(jsonPath("$.sourceUrl").doesNotExist())
            .andExpect(jsonPath("$.active").value(true))
            .andExpect(jsonPath("$.blockCount").value(6))
            .andReturn().getResponse().getContentAsString()
            .transform(json -> JsonPath.read(json, "$.id"));

        mockMvc.perform(get("/api/books"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(id))
            .andExpect(jsonPath("$[0].title").value("Les Misérables - Tome I - Fantine"))
            .andExpect(jsonPath("$[0].activatedAt").exists())
            .andExpect(jsonPath("$[0].blocks").doesNotExist());

        mockMvc.perform(get("/api/books/{id}", id))
            .andExpect(status().isOk())
            .andExpect(header().exists(HttpHeaders.ETAG))
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.author").value("Victor Hugo"))
            .andExpect(jsonPath("$.blocks", hasSize(6)))
            .andExpect(jsonPath("$.blocks[2].kind").value("heading"))
            .andExpect(jsonPath("$.blocks[2].text").value("Livre premier – Un juste"))
            .andExpect(jsonPath("$.blocks[4].kind").value("paragraph"));
    }

    @Test
    @DisplayName("Lists active books, most recently activated first")
    void ordersPublicList() throws Exception {
        String first = uploadId(EpubFixtures.epub("atlantis"));
        String second = uploadId(EpubFixtures.epub("feedbooks"));

        mockMvc.perform(get("/api/books"))
            .andExpect(jsonPath("$[0].id").value(second))
            .andExpect(jsonPath("$[1].id").value(first));
    }

    @Test
    @DisplayName("Withdraws a book from the reader without deleting it, then reactivates it")
    void withdrawsAndReactivates() throws Exception {
        String id = uploadId(EpubFixtures.epub("feedbooks"));

        patchBook(id, "{\"active\": false}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/books")).andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/books/{id}", id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/admin/books").header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].active").value(false))
            .andExpect(jsonPath("$[0].createdAt").exists());

        patchBook(id, "{\"active\": true}").andExpect(jsonPath("$.active").value(true));
        mockMvc.perform(get("/api/books/{id}", id)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Corrects title and author, leaving omitted fields unchanged")
    void editsMetadata() throws Exception {
        String id = uploadId(EpubFixtures.epub("epub3"));

        patchBook(id, "{\"title\": \"Les Fleurs du mal\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Les Fleurs du mal"))
            .andExpect(jsonPath("$.author").value("Charles Baudelaire"))
            .andExpect(jsonPath("$.active").value(true));

        patchBook(id, "{\"author\": \"Baudelaire\"}").andExpect(jsonPath("$.author").value("Baudelaire"));
        mockMvc.perform(get("/api/books")).andExpect(jsonPath("$[0].title").value("Les Fleurs du mal"));
    }

    @Test
    @DisplayName("Refuses a blank title")
    void rejectsBlankTitle() throws Exception {
        String id = uploadId(EpubFixtures.epub("epub3"));

        patchBook(id, "{\"title\": \"  \"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Answers 404 for an unknown book")
    void answersNotFound() throws Exception {
        String unknown = "00000000-0000-0000-0000-000000000000";
        mockMvc.perform(get("/api/books/{id}", unknown)).andExpect(status().isNotFound());
        patchBook(unknown, "{\"active\": false}").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Explains why an EPUB is refused")
    void explainsRejection() throws Exception {
        Map<String, byte[]> entries = EpubFixtures.entries("atlantis");
        entries.put("META-INF/encryption.xml", "<encryption/>".getBytes(StandardCharsets.UTF_8));

        upload(EpubFixtures.zip(entries))
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("EPUB_ENCRYPTED"));
        upload("not a zip".getBytes(StandardCharsets.UTF_8))
            .andExpect(status().isUnprocessableContent())
            .andExpect(jsonPath("$.code").value("EPUB_INVALID"));
        mockMvc.perform(get("/api/books")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Keeps the library administration behind the administrator key")
    void requiresAdminKey() throws Exception {
        mockMvc.perform(multipart("/api/admin/books/upload")
                .file(new MockMultipartFile("file", "book.epub", "application/epub+zip", EpubFixtures.epub("epub3"))))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/books")).andExpect(status().isUnauthorized());
    }

    private ResultActions upload(byte[] epub) throws Exception {
        return mockMvc.perform(multipart("/api/admin/books/upload")
            .file(new MockMultipartFile("file", "book.epub", "application/epub+zip", epub))
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY));
    }

    private String uploadId(byte[] epub) throws Exception {
        String json = upload(epub).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private ResultActions patchBook(String id, String body) throws Exception {
        return mockMvc.perform(patch("/api/admin/books/{id}", id)
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
    }
}
