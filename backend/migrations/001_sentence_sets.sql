-- Sentence sets are isolated from the existing vocabulary_sets table.
-- Target-language text first, English second (matches existing API convention).
CREATE TABLE IF NOT EXISTS sentence_sets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  sentences TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
