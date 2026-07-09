-- ============================================
-- Fix player groups visibility: RPC + RLS read policies
-- Run this if groups create but don't appear on Arena.
-- ============================================

-- Ensure fetch RPC exists
CREATE OR REPLACE FUNCTION get_my_player_groups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'owner_id', g.owner_id,
      'created_at', g.created_at,
      'member_ids', (
        SELECT COALESCE(jsonb_agg(gm.user_id ORDER BY gm.joined_at), '[]'::jsonb)
        FROM group_members gm
        WHERE gm.group_id = g.id
      )
    )
    ORDER BY g.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM player_groups g
  WHERE g.id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_player_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION create_player_group(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_player_group(UUID) TO authenticated;

-- Allow authenticated users to read their groups directly (fallback for client queries)
ALTER TABLE player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
