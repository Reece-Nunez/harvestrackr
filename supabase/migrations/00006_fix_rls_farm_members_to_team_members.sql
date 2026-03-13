-- ============================================================================
-- Migration: Fix all RLS policies to use team_members instead of farm_members
-- ============================================================================
-- The original schema (00001) used farm_members for RLS policies, but the
-- simplified schema (00002) introduced team_members as the actual table.
-- This migration updates all remaining policies that still reference farm_members.
-- ============================================================================

-- farms SELECT
DROP POLICY IF EXISTS "Users can view farms they are members of" ON farms;
CREATE POLICY "Users can view farms they are members of" ON farms FOR SELECT
USING (id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- profiles
DROP POLICY IF EXISTS "Users can view profiles of farm members" ON profiles;
CREATE POLICY "Users can view profiles of farm members" ON profiles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_members tm1
  JOIN team_members tm2 ON tm1.farm_id = tm2.farm_id
  WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
  AND tm1.is_active = true AND tm2.is_active = true
));

-- expenses
DROP POLICY IF EXISTS "Users can view expenses for their farms" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their farms" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses for their farms" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses for their farms" ON expenses;
CREATE POLICY "Users can view expenses for their farms" ON expenses FOR SELECT
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can insert expenses for their farms" ON expenses FOR INSERT
WITH CHECK (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can update expenses for their farms" ON expenses FOR UPDATE
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can delete expenses for their farms" ON expenses FOR DELETE
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- expense_line_items
DROP POLICY IF EXISTS "Users can view expense line items for their farms" ON expense_line_items;
DROP POLICY IF EXISTS "Users can manage expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Users can insert expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Users can update expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Users can delete expense line items" ON expense_line_items;
CREATE POLICY "Users can view expense line items for their farms" ON expense_line_items FOR SELECT
USING (EXISTS (SELECT 1 FROM expenses e JOIN team_members tm ON tm.farm_id = e.farm_id WHERE e.id = expense_line_items.expense_id AND tm.user_id = auth.uid() AND tm.is_active = true));
CREATE POLICY "Users can manage expense line items" ON expense_line_items FOR ALL
USING (EXISTS (SELECT 1 FROM expenses e JOIN team_members tm ON tm.farm_id = e.farm_id WHERE e.id = expense_line_items.expense_id AND tm.user_id = auth.uid() AND tm.is_active = true));

-- income
DROP POLICY IF EXISTS "Users can view income for their farms" ON income;
DROP POLICY IF EXISTS "Users can insert income for their farms" ON income;
DROP POLICY IF EXISTS "Users can update income for their farms" ON income;
DROP POLICY IF EXISTS "Users can delete income for their farms" ON income;
CREATE POLICY "Users can view income for their farms" ON income FOR SELECT
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can insert income for their farms" ON income FOR INSERT
WITH CHECK (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can update income for their farms" ON income FOR UPDATE
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can delete income for their farms" ON income FOR DELETE
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- livestock
DROP POLICY IF EXISTS "Users can manage livestock for their farms" ON livestock;
CREATE POLICY "Users can manage livestock for their farms" ON livestock FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- customers
DROP POLICY IF EXISTS "Users can manage customers for their farms" ON customers;
CREATE POLICY "Users can manage customers for their farms" ON customers FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- invoices
DROP POLICY IF EXISTS "Users can manage invoices for their farms" ON invoices;
CREATE POLICY "Users can manage invoices for their farms" ON invoices FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- fields
DROP POLICY IF EXISTS "Users can manage fields for their farms" ON fields;
CREATE POLICY "Users can manage fields for their farms" ON fields FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- chicken_flocks
DROP POLICY IF EXISTS "Users can manage flocks for their farms" ON chicken_flocks;
CREATE POLICY "Users can manage flocks for their farms" ON chicken_flocks FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));

-- inventory_items
DROP POLICY IF EXISTS "Users can manage inventory for their farms" ON inventory_items;
CREATE POLICY "Users can manage inventory for their farms" ON inventory_items FOR ALL
USING (farm_id IN (SELECT farm_id FROM team_members WHERE user_id = auth.uid() AND is_active = true));
