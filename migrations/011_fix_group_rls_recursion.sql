-- ============================================
-- Fix RLS infinite recursion on group_members
-- ============================================
-- The previous policy queried group_members inside its own policy check.
-- Use a SECURITY DEFINER helper instead.

CREATE OR REPLACE FUNCTION user_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION user_group_ids() TO authenticated;

DROP POLICY IF EXISTS "Users can read groups they belong to" ON player_groups;
CREATE POLICY "Users can read groups they belong to"
  ON player_groups FOR SELECT
  TO authenticated
  USING (id IN (SELECT user_group_ids()));

DROP POLICY IF EXISTS "Users can read members of their groups" ON group_members;
CREATE POLICY "Users can read members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT user_group_ids()));

NOTIFY pgrst, 'reload schema';
