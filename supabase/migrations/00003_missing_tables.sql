-- ============================================================================
-- Add missing tables that the Next.js app expects
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TEAM MEMBERS TABLE
-- (The initial schema created farm_members; the app uses team_members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_farm_id ON team_members(farm_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members for their farms"
  ON team_members FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Farm owners/admins can manage team members"
  ON team_members FOR ALL
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR (
      farm_id IN (
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN') AND is_active = true
      )
    )
  );

-- Migrate existing farm_members data to team_members (if any)
INSERT INTO team_members (farm_id, user_id, role, is_active, joined_at, created_at, updated_at)
SELECT farm_id, user_id, COALESCE(role, 'VIEWER'), true, COALESCE(joined_at, NOW()), NOW(), NOW()
FROM farm_members
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.farm_id = farm_members.farm_id AND tm.user_id = farm_members.user_id
)
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- Also ensure farm owners have a team_members row
INSERT INTO team_members (farm_id, user_id, role, is_active, joined_at)
SELECT id, owner_id, 'OWNER', true, created_at
FROM farms
WHERE owner_id IS NOT NULL
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- ============================================================================
-- INVOICE ITEMS TABLE
-- (The initial schema created invoice_line_items; the app uses invoice_items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    category TEXT,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items for their farms"
  ON invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE farm_id IN (
        SELECT id FROM farms WHERE owner_id = auth.uid()
        UNION
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage invoice items for their farms"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE farm_id IN (
        SELECT id FROM farms WHERE owner_id = auth.uid()
        UNION
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Migrate existing invoice_line_items data (if any)
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, created_at)
SELECT invoice_id, description, quantity, unit_price, total, created_at
FROM invoice_line_items
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MEDICAL RECORDS TABLE
-- (The initial schema created livestock_health_records; the app uses medical_records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    medicine TEXT,
    dosage TEXT,
    administered_by TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_livestock_id ON medical_records(livestock_id);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medical records for their farms"
  ON medical_records FOR SELECT
  USING (
    livestock_id IN (
      SELECT id FROM livestock WHERE farm_id IN (
        SELECT id FROM farms WHERE owner_id = auth.uid()
        UNION
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage medical records for their farms"
  ON medical_records FOR ALL
  USING (
    livestock_id IN (
      SELECT id FROM livestock WHERE farm_id IN (
        SELECT id FROM farms WHERE owner_id = auth.uid()
        UNION
        SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Migrate existing livestock_health_records data (if any)
INSERT INTO medical_records (livestock_id, type, date, description, medicine, dosage, administered_by, follow_up_date, notes, created_at)
SELECT livestock_id, type, date, description, medicine, dosage, administered_by, follow_up_date, notes, created_at
FROM livestock_health_records
ON CONFLICT DO NOTHING;

-- ============================================================================
-- IMPORT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    import_type TEXT NOT NULL CHECK (import_type IN ('expenses', 'income')),
    filename TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    successful_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import history for their farms"
  ON import_history FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
      UNION
      SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert import history"
  ON import_history FOR INSERT
  WITH CHECK (user_id = auth.uid());
