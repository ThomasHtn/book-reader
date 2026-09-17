package io.github.thomashtn.bookreader.settings.controller;

import static io.github.thomashtn.bookreader.shared.config.OpenApiConfig.ADMIN_KEY_SECURITY_SCHEME;

import io.github.thomashtn.bookreader.settings.dto.ReaderSettingsResponse;
import io.github.thomashtn.bookreader.settings.dto.UpdateReaderSettingsRequest;
import io.github.thomashtn.bookreader.settings.service.ReaderSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Backoffice changes to the display settings.
 */
@RestController
@RequestMapping("/api/admin/settings")
@Tag(name = "Administration - Settings", description = "Remote calibration of the reader.")
@SecurityRequirement(name = ADMIN_KEY_SECURITY_SCHEME)
public class AdminReaderSettingsController {

    private final ReaderSettingsService service;

    /**
     * Creates the controller.
     *
     * @param service settings service
     */
    public AdminReaderSettingsController(ReaderSettingsService service) {
        this.service = service;
    }

    /**
     * Replaces the display settings; the reader picks them up on its next poll.
     *
     * @param request new settings
     * @return settings after the change
     */
    @PutMapping
    @Operation(summary = "Change the reader display settings")
    @ApiResponse(responseCode = "200", description = "Settings applied.")
    @ApiResponse(responseCode = "400", description = "Unknown tier or theme.")
    public ReaderSettingsResponse updateSettings(@Valid @RequestBody UpdateReaderSettingsRequest request) {
        return service.updateSettings(request);
    }
}
