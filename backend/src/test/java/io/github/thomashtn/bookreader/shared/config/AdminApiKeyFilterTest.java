package io.github.thomashtn.bookreader.shared.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies the administrator key check through the HTTP filter chain.
 */
class AdminApiKeyFilterTest extends PostgreSqlIntegrationTest {

    /**
     * Side-effect-free administrative route.
     */
    private static final String SESSION_ENDPOINT = "/api/admin/session";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Rejects an administrative request without key with 401")
    void rejectsMissingKey() throws Exception {
        mockMvc.perform(get(SESSION_ENDPOINT))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("ADMIN_KEY_MISSING"));
    }

    @Test
    @DisplayName("Rejects an administrative request with a wrong key with 403")
    void rejectsInvalidKey() throws Exception {
        mockMvc.perform(get(SESSION_ENDPOINT).header(AdminApiKeyFilter.HEADER_NAME, "wrong-key"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ADMIN_KEY_INVALID"));
    }

    @Test
    @DisplayName("Confirms a valid key without side effect")
    void acceptsValidKey() throws Exception {
        mockMvc.perform(get(SESSION_ENDPOINT).header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Does not let a percent-encoded path skip the key check")
    void guardsEncodedAdminPath() throws Exception {
        mockMvc.perform(get("/api/%61dmin/session"))
            .andExpect(status().is4xxClientError());
    }
}
