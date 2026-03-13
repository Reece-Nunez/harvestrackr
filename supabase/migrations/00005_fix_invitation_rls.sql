-- ============================================================================
-- Fix team_invitations RLS policies
-- The original schema's RLS uses user_is_farm_admin() which checks farm_members,
-- but the app uses the team_members table (created in 00003).
-- This migration updates the policies to check team_members instead.
-- ============================================================================

-- Drop existing policies on team_invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their farms" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON team_invitations;

-- Recreate policies using team_members table
CREATE POLICY "Users can view invitations for their farms"
  ON team_invitations FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR farm_id IN (
      SELECT farm_id FROM team_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view invitations sent to their email"
  ON team_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR farm_id IN (
      SELECT farm_id FROM team_members
      WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'MANAGER')
        AND is_active = true
    )
  );

CREATE POLICY "Admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR farm_id IN (
      SELECT farm_id FROM team_members
      WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
        AND is_active = true
    )
  );

CREATE POLICY "Users can accept their invitations"
  ON team_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    farm_id IN (
      SELECT id FROM farms WHERE owner_id = auth.uid()
    )
    OR farm_id IN (
      SELECT farm_id FROM team_members
      WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
        AND is_active = true
    )
  );
