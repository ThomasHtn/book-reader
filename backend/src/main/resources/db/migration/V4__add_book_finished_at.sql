-- Set when the caregiver marks a book as read; the reader treats it as finished unless read since.
ALTER TABLE book ADD COLUMN finished_at TIMESTAMPTZ;
