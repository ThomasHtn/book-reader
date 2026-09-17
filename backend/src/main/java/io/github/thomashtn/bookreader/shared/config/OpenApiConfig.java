package io.github.thomashtn.bookreader.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Centralizes the OpenAPI metadata displayed by Swagger UI.
 *
 * <p>The configuration also declares the reusable API-key authentication scheme
 * used by every endpoint located under {@code /api/admin}.</p>
 */
@Configuration
public class OpenApiConfig {

    /**
     * Name referenced by {@code @SecurityRequirement} annotations.
     */
    public static final String ADMIN_KEY_SECURITY_SCHEME = "adminKey";

    /**
     * Builds the global OpenAPI document definition.
     *
     * @return fully configured OpenAPI metadata and reusable components
     */
    @Bean
    public OpenAPI bookReaderOpenApi() {
        return new OpenAPI()
            .info(createApiInformation())
            .components(createComponents());
    }

    /**
     * Creates the human-readable project information shown at the top of Swagger UI.
     *
     * @return API title, version, description and project contact
     */
    private Info createApiInformation() {
        return new Info()
            .title("Book Reader API")
            .version("1.0.0")
            .description("""
                REST API used by the accessible reader and its backoffice.

                The public API exposes active books and display settings.

                Administrative routes search the OPDS catalogue, import books and change settings.
                They require the X-Admin-Key HTTP header.
                """)
            .contact(new Contact().name("Thomas HTN"));
    }

    /**
     * Creates reusable schemas shared by multiple OpenAPI operations.
     *
     * @return component registry containing the administrator security scheme
     */
    private Components createComponents() {
        return new Components()
            .addSecuritySchemes(
                ADMIN_KEY_SECURITY_SCHEME,
                createAdminKeySecurityScheme()
            );
    }

    /**
     * Describes the static administrator key expected in an HTTP request header.
     *
     * @return API-key security scheme for the {@code X-Admin-Key} header
     */
    private SecurityScheme createAdminKeySecurityScheme() {
        return new SecurityScheme()
            .name(AdminApiKeyFilter.HEADER_NAME)
            .type(SecurityScheme.Type.APIKEY)
            .in(SecurityScheme.In.HEADER)
            .description("Administrator key configured through the ADMIN_API_KEY environment variable.");
    }
}
