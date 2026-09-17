-- Imported books; content holds the internal format blocks, withdrawn books stay with active = false.
CREATE TABLE book (
    id           UUID         PRIMARY KEY,
    title        VARCHAR(500) NOT NULL,
    author       VARCHAR(500) NOT NULL,
    source       VARCHAR(20)  NOT NULL CHECK (source IN ('catalogue', 'upload')),
    source_id    VARCHAR(500) UNIQUE,
    source_url   VARCHAR(2000),
    content      JSONB        NOT NULL,
    block_count  INTEGER      NOT NULL,
    active       BOOLEAN      NOT NULL,
    activated_at TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    CHECK ((source = 'catalogue') = (source_id IS NOT NULL))
);

CREATE INDEX book_active_activated_at_idx ON book (activated_at DESC) WHERE active;
