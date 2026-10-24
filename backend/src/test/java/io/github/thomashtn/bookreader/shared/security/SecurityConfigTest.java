package io.github.thomashtn.bookreader.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Specifies the probe routes of the main port and keeps the actuator off it.
 */
class SecurityConfigTest extends PostgreSqlIntegrationTest {

    /**
     * Client driving the whole filter chain.
     */
    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Reports itself ready on the main port only once the database answers, for the public probe")
    void exposesReadinessWithDatabase() throws Exception {
        mockMvc.perform(get("/readyz"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Reports itself alive on the main port, without a key")
    void exposesLiveness() throws Exception {
        mockMvc.perform(get("/livez"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Keeps the actuator off the main port, so a proxy routing mistake cannot publish it")
    void keepsActuatorOffMainPort() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
            .andExpect(status().isNotFound());
    }
}
