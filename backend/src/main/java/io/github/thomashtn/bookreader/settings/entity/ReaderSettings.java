package io.github.thomashtn.bookreader.settings.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Set;

/**
 * Global display settings of the reader, stored as the single row of {@code reader_settings}.
 */
@Entity
@Table(name = "reader_settings")
public class ReaderSettings {

    /**
     * Identifier of the only row.
     */
    public static final short SINGLETON_ID = 1;

    /**
     * Font tiers the reader supports, in pixels on a screen of at least 1280 CSS pixels.
     */
    public static final Set<Integer> FONT_TIERS = Set.of(48, 72, 100, 140);

    @Id
    private short id;

    @Column(name = "font_tier", nullable = false)
    private int fontTier;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Constructor required by JPA.
     */
    protected ReaderSettings() {
    }

    /**
     * Returns the font tier.
     *
     * @return tier in pixels
     */
    public int getFontTier() {
        return fontTier;
    }

    /**
     * Replaces the settings.
     *
     * @param newFontTier one of {@link #FONT_TIERS}
     * @param now         instant of the change
     */
    public void update(int newFontTier, Instant now) {
        this.fontTier = newFontTier;
        this.updatedAt = now;
    }
}
