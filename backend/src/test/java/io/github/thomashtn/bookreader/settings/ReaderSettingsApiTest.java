package io.github.thomashtn.bookreader.settings;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.shared.config.AdminApiKeyFilter;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
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

    @Autowired
    private MockMvc mockMvc;

    /**
     * Restores the migrated defaults so test order never matters.
     */
    @AfterEach
    void restoreDefaults() throws Exception {
        putSettings("{\"fontTier\": 100, \"theme\": \"dark-on-light\"}");
    }

    @Test
    @DisplayName("Serves the default settings: tier 100, dark text on light paper")
    void servesDefaults() throws Exception {
        mockMvc.perform(get("/api/settings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(100))
            .andExpect(jsonPath("$.theme").value("dark-on-light"));
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
    @DisplayName("Applies new settings from the backoffice and changes the ETag")
    void updatesSettings() throws Exception {
        String before = mockMvc.perform(get("/api/settings")).andReturn().getResponse().getHeader(HttpHeaders.ETAG);

        putSettings("{\"fontTier\": 140, \"theme\": \"yellow-on-black\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(140))
            .andExpect(jsonPath("$.theme").value("yellow-on-black"));

        mockMvc.perform(get("/api/settings").header(HttpHeaders.IF_NONE_MATCH, before))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fontTier").value(140))
            .andExpect(jsonPath("$.theme").value("yellow-on-black"));
    }

    @Test
    @DisplayName("Rejects a font tier outside 48, 72, 100 and 140")
    void rejectsUnknownTier() throws Exception {
        putSettings("{\"fontTier\": 90, \"theme\": \"light-on-dark\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Rejects an unknown theme")
    void rejectsUnknownTheme() throws Exception {
        putSettings("{\"fontTier\": 100, \"theme\": \"pink\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    @DisplayName("Rejects missing fields")
    void rejectsMissingFields() throws Exception {
        putSettings("{}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.fontTier").exists())
            .andExpect(jsonPath("$.errors.theme").exists());
    }

    @Test
    @DisplayName("Refuses a settings update without administrator key")
    void requiresAdminKey() throws Exception {
        mockMvc.perform(put("/api/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fontTier\": 48, \"theme\": \"dark-on-light\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Keeps the public API read-only")
    void refusesWritesOnPublicApi() throws Exception {
        mockMvc.perform(post("/api/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fontTier\": 48, \"theme\": \"dark-on-light\"}"))
            .andExpect(status().isForbidden());
    }

    private ResultActions putSettings(String body) throws Exception {
        return mockMvc.perform(put("/api/admin/settings")
            .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
    }
}
