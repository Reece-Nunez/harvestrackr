-- ============================================================================
-- Fix RLS on users table
-- The users table has RLS enabled but no policies, blocking all access.
-- This causes "permission denied for table users" errors when other
-- RLS policies or FK checks reference the users table.
-- ============================================================================

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Allow authenticated users to read basic info of other users
-- (needed for team member lookups, invitation checks, etc.)
CREATE POLICY "Authenticated users can read basic user info"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
