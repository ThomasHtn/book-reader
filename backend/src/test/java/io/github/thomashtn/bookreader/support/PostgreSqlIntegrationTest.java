package io.github.thomashtn.bookreader.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for Spring tests, backed by one PostgreSQL 17 container shared by the whole suite.
 *
 * <p>Singleton container pattern: started once in a static initializer and reaped by Ryuk, so the
 * container outlives every test class instead of stopping after the first one. Tests run on the
 * production {@code application.properties}; only secrets and the lockout budget are set here.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.admin-api-key=" + PostgreSqlIntegrationTest.ADMIN_KEY,
    // High budget so tests sending a wrong key never trip the lockout.
    "app.admin-rate-limit.max-failures=1000000"
})
public abstract class PostgreSqlIntegrationTest {

    /**
     * Administrator key configured in the test properties.
     */
    protected static final String ADMIN_KEY = "test-admin-key-0123456789abcdef0";

    /**
     * PostgreSQL container shared by every test class.
     */
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRESQL.start();
    }

    /**
     * Points the datasource at the shared container.
     *
     * @param registry Spring dynamic property registry
     */
    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }
}
