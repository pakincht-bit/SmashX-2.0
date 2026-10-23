-- Rename a player group (owner only)
CREATE OR REPLACE FUNCTION rename_player_group(p_group_id UUID, p_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF trim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  SELECT owner_id INTO v_owner_id FROM player_groups WHERE id = p_group_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can rename the group';
  END IF;

  UPDATE player_groups SET name = trim(p_name) WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rename_player_group(UUID, TEXT) TO authenticated;
