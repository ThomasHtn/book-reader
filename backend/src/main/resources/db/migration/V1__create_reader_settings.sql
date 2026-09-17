-- Global display settings: exactly one row, edited from the backoffice.
CREATE TABLE reader_settings (
    id         SMALLINT    PRIMARY KEY CHECK (id = 1),
    font_tier  INTEGER     NOT NULL CHECK (font_tier IN (48, 72, 100, 140)),
    theme      VARCHAR(20) NOT NULL CHECK (theme IN ('dark-on-light', 'light-on-dark', 'yellow-on-black')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO reader_settings (id, font_tier, theme) VALUES (1, 100, 'dark-on-light');
