-- Tiers become reading sizes for the two-page reader (28, 32, 36, 40 px); the stored one moves to the
-- nearest new tier, 100 becoming the new default of 32.
ALTER TABLE reader_settings DROP CONSTRAINT reader_settings_font_tier_check;

UPDATE reader_settings
SET font_tier = CASE font_tier WHEN 140 THEN 40 WHEN 100 THEN 32 ELSE 28 END;

ALTER TABLE reader_settings
    ADD CONSTRAINT reader_settings_font_tier_check CHECK (font_tier IN (28, 32, 36, 40));
