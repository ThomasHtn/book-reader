package io.github.thomashtn.bookreader.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
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

    /**
     * Client driving the whole filter chain.
     */
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
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.title").value("Too Many Requests"))
            .andExpect(jsonPath("$.code").value("ADMIN_KEY_RATE_LIMITED"));
    }

    @Test
    @DisplayName("Never locks out an address sending the right key in parallel, as the backoffice does")
    void neverCountsValidKeys() throws Exception {
        List<Callable<Integer>> requests = IntStream.range(0, 20)
            .<Callable<Integer>>mapToObj(index -> () -> mockMvc.perform(
                get("/api/admin/session")
                    .header(AdminApiKeyFilter.HEADER_NAME, ADMIN_KEY)
                    .with(request -> {
                        request.setRemoteAddr("192.0.2.10");
                        return request;
                    })
            ).andReturn().getResponse().getStatus())
            .toList();

        try (ExecutorService executor = Executors.newFixedThreadPool(requests.size())) {
            for (Future<Integer> status : executor.invokeAll(requests)) {
                assertThat(status.get()).isLessThan(300);
            }
        }
    }
}
