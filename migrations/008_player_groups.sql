-- ============================================
-- Player Groups: friend groups for invites & rankings
-- ============================================

CREATE TABLE IF NOT EXISTS player_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES player_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_player_groups_owner_id ON player_groups(owner_id);

-- Create a group and add the owner as the first member
CREATE OR REPLACE FUNCTION create_player_group(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO player_groups (name, owner_id)
  VALUES (trim(p_name), auth.uid())
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid());

  RETURN v_group_id;
END;
$$;

-- Owner adds a player to their group
CREATE OR REPLACE FUNCTION add_group_member(p_group_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM player_groups WHERE id = p_group_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can add members';
  END IF;

  INSERT INTO group_members (group_id, user_id)
  VALUES (p_group_id, p_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

-- Owner removes a member, or a member removes themselves
CREATE OR REPLACE FUNCTION remove_group_member(p_group_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM player_groups WHERE id = p_group_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF auth.uid() <> v_owner_id AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed to remove this member';
  END IF;
  IF v_owner_id = p_user_id THEN
    RAISE EXCEPTION 'Group owner cannot leave; delete the group instead';
  END IF;

  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

-- Owner deletes a group
CREATE OR REPLACE FUNCTION delete_player_group(p_group_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM player_groups WHERE id = p_group_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can delete the group';
  END IF;

  DELETE FROM player_groups WHERE id = p_group_id;
END;
$$;

-- Fetch all groups for the current user (bypasses RLS on reads)
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
