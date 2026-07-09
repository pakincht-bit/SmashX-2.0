-- ============================================
-- RPC: get_my_player_groups
-- ============================================
-- Returns all groups the current user belongs to, bypassing RLS on reads.
-- ============================================

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
