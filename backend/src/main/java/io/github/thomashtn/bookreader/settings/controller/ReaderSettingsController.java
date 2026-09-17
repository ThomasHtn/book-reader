package io.github.thomashtn.bookreader.settings.controller;

import io.github.thomashtn.bookreader.settings.dto.ReaderSettingsResponse;
import io.github.thomashtn.bookreader.settings.service.ReaderSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public read access to the display settings, polled by the reader.
 */
@RestController
@RequestMapping("/api/settings")
@Tag(name = "Settings", description = "Reader display settings.")
public class ReaderSettingsController {

    private final ReaderSettingsService service;

    /**
     * Creates the controller.
     *
     * @param service settings service
     */
    public ReaderSettingsController(ReaderSettingsService service) {
        this.service = service;
    }

    /**
     * Returns the current display settings.
     *
     * @return current settings
     */
    @GetMapping
    @Operation(summary = "Get the reader display settings")
    public ReaderSettingsResponse getSettings() {
        return service.getSettings();
    }
}
