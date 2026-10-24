package io.github.thomashtn.bookreader.settings;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.shared.security.AdminApiKeyFilter;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.net.URI;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the public and administrative reader settings API (specification sections 5.5 and 10).
 */
class ReaderSettingsApiTest extends PostgreSqlIntegrationTest {

    /**
     * Client driving the whole filter chain.
     */
    @Autowired
    private MockMvc mockMvc;

    /**
     * Restores the migrated defaults so test order never matters.
     */
    @AfterEach
    void restoreDefaults() throws Exception {
        putSettings("{\"fontTier\": 32}");
    }

    @Test
    @DisplayName("Serves the default settings: tier 32")
    void servesDefaults() throws Exception {
        mockMvc.perform(get("/api/settings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(32));
    }

    @Test
    @DisplayName("Answers 304 when the reader already holds the current settings")
    void answersNotModifiedForCurrentEtag() throws Exception {
        String etag = mockMvc.perform(get("/api/settings"))
            // Weak, because Tomcat refuses to compress a response carrying a strong ETag.
            .andExpect(header().string(HttpHeaders.ETAG, startsWith("W/")))
            .andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        mockMvc.perform(get("/api/settings").header(HttpHeaders.IF_NONE_MATCH, etag))
            .andExpect(status().isNotModified());
    }

    @Test
    @DisplayName("Lets the browser keep public responses but revalidate them, never admin ones")
    void setsCacheControl() throws Exception {
        mockMvc.perform(get("/api/settings"))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"));
        putSettings("{\"fontTier\": 32}")
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    @DisplayName("Never lets the browser store an admin response reached through a percent-encoded path")
    void setsNoStoreOnEncodedAdminPath() throws Exception {
        mockMvc.perform(get(URI.create("/api/%61dmin/session")).header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY))
            .andExpect(status().isNoContent())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
    }

    @Test
    @DisplayName("Applies new settings from the backoffice and changes the ETag")
    void updatesSettings() throws Exception {
        String before = mockMvc.perform(get("/api/settings")).andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        putSettings("{\"fontTier\": 40}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(40));

        mockMvc.perform(get("/api/settings").header(HttpHeaders.IF_NONE_MATCH, before))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(40));
    }

    @Test
    @DisplayName("Rejects a font tier outside 28, 32, 36 and 40")
    void rejectsUnknownTier() throws Exception {
        putSettings("{\"fontTier\": 90}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Rejects missing fields")
    void rejectsMissingFields() throws Exception {
        putSettings("{}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.fontTier").exists());
    }

    @Test
    @DisplayName("Refuses a settings update without administrator key")
    void requiresAdminKey() throws Exception {
        mockMvc.perform(put("/api/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fontTier\": 28}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Keeps the public API read-only")
    void refusesWritesOnPublicApi() throws Exception {
        mockMvc.perform(post("/api/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fontTier\": 28}"))
            .andExpect(status().isForbidden());
    }

    /**
     * Replaces the settings with the administrator key.
     *
     * @param body JSON body
     * @return response
     * @throws Exception when the request cannot be performed
     */
    private ResultActions putSettings(String body) throws Exception {
        return mockMvc.perform(put("/api/admin/settings")
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
    }
}
