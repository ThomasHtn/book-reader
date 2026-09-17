package io.github.thomashtn.bookreader.shared.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies the per-address lockout through the HTTP filter chain, in its own context with a low budget.
 */
@TestPropertySource(properties = "app.admin-rate-limit.max-failures=2")
class AdminApiKeyFilterRateLimitTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Locks an address out with 429 after too many wrong keys, even with the right key")
    void locksOutAfterFailureBudget() throws Exception {
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(get("/api/admin/session").header(AdminApiKeyFilter.HEADER_NAME, "wrong-key"))
                .andExpect(status().isForbidden());
        }

        mockMvc.perform(get("/api/admin/session").header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY))
            .andExpect(status().isTooManyRequests());
    }
}
