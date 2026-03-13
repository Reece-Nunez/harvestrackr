-- Import history table for tracking CSV imports
CREATE TABLE IF NOT EXISTS import_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  import_type TEXT NOT NULL CHECK (import_type IN ('expenses', 'income')),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import history for their farms"
  ON import_history FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
    )
    OR farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert import history for their farms"
  ON import_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      farm_id IN (
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
      )
      OR farm_id IN (
        SELECT id FROM farms WHERE owner_id = auth.uid()
      )
    )
  );
