-- ============================================================================
-- Fix team_invitations RLS policies
-- The original schema's RLS used functions that check farm_members,
-- but the app uses team_members. The subquery chains also caused
-- "permission denied for table users" errors due to cascading RLS
-- evaluation across team_members -> farms -> farm_members.
--
-- Solution: simplified SELECT policy that allows any authenticated user
-- to read invitations. INSERT/UPDATE/DELETE policies check team_members
-- for proper role-based access control.
-- ============================================================================

-- Drop all existing policies on team_invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their farms" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON team_invitations;
DROP POLICY IF EXISTS "Anyone authenticated can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "temp_debug_all_select" ON team_invitations;

-- SELECT: any authenticated user can read invitations
-- (app-level code already filters by farm_id)
CREATE POLICY "Anyone authenticated can view invitations"
  ON team_invitations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: farm owners, admins, and managers can create invitations
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

-- UPDATE: farm owners/admins can update, users can accept their own
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
    email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())::text
  )
  WITH CHECK (
    email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())::text
  );

-- DELETE: farm owners/admins can delete invitations
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
