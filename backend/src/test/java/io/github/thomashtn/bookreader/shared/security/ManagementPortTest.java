package io.github.thomashtn.bookreader.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalManagementPort;

/**
 * Specifies the actuator on its own port, open to probes and scrapers inside the Docker networks.
 *
 * <p>A real server is started: MockMvc only sees the main port.</p>
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class ManagementPortTest extends PostgreSqlIntegrationTest {

    /**
     * Client for the real management server.
     */
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    /**
     * Random management port of this test server.
     */
    @LocalManagementPort
    private int managementPort;

    @Test
    @DisplayName("Reports itself up on the management port without a key")
    void exposesHealth() throws Exception {
        HttpResponse<String> response = getManagement("/actuator/health");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Publishes the running build on the info endpoint, so a deployment can be checked")
    void exposesBuildInfo() throws Exception {
        HttpResponse<String> response = getManagement("/actuator/info");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"artifact\":\"book-reader\"");
    }

    @Test
    @DisplayName("Serves Prometheus metrics without a key, tagged with the application name")
    void exposesPrometheusMetrics() throws Exception {
        HttpResponse<String> response = getManagement("/actuator/prometheus");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("hikaricp_connections_active{application=\"book-reader\"");
    }

    /**
     * Sends a GET to the management server.
     *
     * @param path absolute path on the management port
     * @return response with its body as text
     * @throws IOException when the request fails
     * @throws InterruptedException when interrupted while waiting
     */
    private HttpResponse<String> getManagement(String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + managementPort + path)).build();
        return CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
