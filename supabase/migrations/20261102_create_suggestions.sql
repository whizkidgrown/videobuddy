-- Create suggestions table for AI recommendations
CREATE TABLE IF NOT EXISTS suggestions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('top', 'batch')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on kind for faster filtering
CREATE INDEX IF NOT EXISTS idx_suggestions_kind ON suggestions(kind);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read all suggestions
CREATE POLICY "Allow anonymous select on suggestions"
  ON suggestions
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Only service role can insert/update/delete
CREATE POLICY "Service role can manage suggestions"
  ON suggestions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
