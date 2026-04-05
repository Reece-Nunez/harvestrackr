-- ============================================================================
-- Migration: Drop stale policies from 00001_initial_schema.sql
-- ============================================================================
-- The 00006 migration tried to drop old policies but used wrong names.
-- The original 00001 policies have different names and were never dropped,
-- causing "operator does not exist: text = team_role" errors because they
-- call functions (user_can_write_farm, user_is_farm_admin, user_has_farm_access)
-- that reference the old farm_members table with team_role enum column.
-- ============================================================================

-- Drop old expense policies (from 00001)
DROP POLICY IF EXISTS "Users can view expenses of their farms" ON expenses;
DROP POLICY IF EXISTS "Writers can create expenses" ON expenses;
DROP POLICY IF EXISTS "Writers can update expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;

-- Drop old expense_line_items policies (from 00001)
DROP POLICY IF EXISTS "Users can view expense line items of their farms" ON expense_line_items;
DROP POLICY IF EXISTS "Writers can create expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Writers can update expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Admins can delete expense line items" ON expense_line_items;

-- Drop old income policies (from 00001)
DROP POLICY IF EXISTS "Users can view income of their farms" ON income;
DROP POLICY IF EXISTS "Writers can create income" ON income;
DROP POLICY IF EXISTS "Writers can update income" ON income;
DROP POLICY IF EXISTS "Admins can delete income" ON income;

-- Drop old livestock policies (from 00001)
DROP POLICY IF EXISTS "Users can view livestock of their farms" ON livestock;
DROP POLICY IF EXISTS "Writers can create livestock" ON livestock;
DROP POLICY IF EXISTS "Writers can update livestock" ON livestock;
DROP POLICY IF EXISTS "Admins can delete livestock" ON livestock;

-- Drop old customer policies (from 00001)
DROP POLICY IF EXISTS "Users can view customers of their farms" ON customers;
DROP POLICY IF EXISTS "Writers can create customers" ON customers;
DROP POLICY IF EXISTS "Writers can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- Drop old invoice policies (from 00001)
DROP POLICY IF EXISTS "Users can view invoices of their farms" ON invoices;
DROP POLICY IF EXISTS "Writers can create invoices" ON invoices;
DROP POLICY IF EXISTS "Writers can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- Drop old invoice_line_items policies (from 00001)
DROP POLICY IF EXISTS "Users can view invoice line items of their farms" ON invoice_line_items;
DROP POLICY IF EXISTS "Writers can create invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Writers can update invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Admins can delete invoice line items" ON invoice_line_items;

-- Drop old field policies (from 00001)
DROP POLICY IF EXISTS "Users can view fields of their farms" ON fields;
DROP POLICY IF EXISTS "Writers can create fields" ON fields;
DROP POLICY IF EXISTS "Writers can update fields" ON fields;
DROP POLICY IF EXISTS "Admins can delete fields" ON fields;

-- Drop old farm policies (from 00001)
DROP POLICY IF EXISTS "Users can view farms they are members of" ON farms;
DROP POLICY IF EXISTS "Admins can update farm details" ON farms;
DROP POLICY IF EXISTS "Only owners can delete farms" ON farms;
DROP POLICY IF EXISTS "Authenticated users can create farms" ON farms;

-- Drop old livestock health records policies (from 00001)
DROP POLICY IF EXISTS "Users can view livestock health records of their farms" ON livestock_health_records;
DROP POLICY IF EXISTS "Writers can create livestock health records" ON livestock_health_records;
DROP POLICY IF EXISTS "Writers can update livestock health records" ON livestock_health_records;
DROP POLICY IF EXISTS "Admins can delete livestock health records" ON livestock_health_records;

-- Drop old farm_members policies (from 00001) -- table may or may not exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farm_members') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view members of their farms" ON farm_members';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can add farm members" ON farm_members';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can update farm members" ON farm_members';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can remove farm members" ON farm_members';
        EXECUTE 'DROP POLICY IF EXISTS "Users can remove themselves from farms" ON farm_members';
    END IF;
END $$;
