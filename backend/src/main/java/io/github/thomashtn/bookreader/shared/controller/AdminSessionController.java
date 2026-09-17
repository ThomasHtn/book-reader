package io.github.thomashtn.bookreader.shared.controller;

import static io.github.thomashtn.bookreader.shared.config.OpenApiConfig.ADMIN_KEY_SECURITY_SCHEME;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the administrator key verification endpoint.
 */
@RestController
@RequestMapping("/api/admin/session")
@Tag(name = "Administration - Session", description = "Administrator key verification.")
@SecurityRequirement(name = ADMIN_KEY_SECURITY_SCHEME)
public class AdminSessionController {

    /**
     * Answers successfully whenever the request carried a valid administrator key.
     *
     * <p>Deliberately empty and free of any collaborator. The whole point of this route is to be
     * reached, or not: a request without the header never gets here because
     * {@code AdminApiKeyFilter} rejects it with a 401, and an invalid key gets a 403. That makes it
     * the one endpoint a client can call to check a key before running a real operation, without
     * risking a side effect if the key turns out to be valid.
     */
    @GetMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
        summary = "Verify the administrator key",
        description = """
            Confirms that the supplied X-Admin-Key value grants access to the administration API.
            This route performs no work and changes no state, so it can be called purely to
            validate a key.
            """
    )
    @ApiResponse(responseCode = "204", description = "The administrator key is valid.")
    @ApiResponse(responseCode = "401", description = "X-Admin-Key header is missing.")
    @ApiResponse(responseCode = "403", description = "X-Admin-Key value is invalid.")
    public void verifyAdminKey() {
        // Reaching this method is the answer.
    }
}
