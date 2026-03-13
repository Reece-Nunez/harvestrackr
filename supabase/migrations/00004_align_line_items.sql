-- ============================================================================
-- Align expense_line_items with application code
-- Adds columns that the app expects but the original schema didn't include
-- ============================================================================

-- Add category column (used for analytics, reports, and display)
ALTER TABLE expense_line_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Add item column (human-readable alias for description)
ALTER TABLE expense_line_items ADD COLUMN IF NOT EXISTS item TEXT;

-- Add unit_cost column (alias for unit_price used by some code paths)
ALTER TABLE expense_line_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12, 2);

-- Backfill: copy description into item where item is null
UPDATE expense_line_items SET item = description WHERE item IS NULL;

-- Backfill: copy unit_price into unit_cost where unit_cost is null
UPDATE expense_line_items SET unit_cost = unit_price WHERE unit_cost IS NULL;

-- Default category to 'Supplies Purchased' for existing rows
UPDATE expense_line_items SET category = 'Supplies Purchased' WHERE category IS NULL;
