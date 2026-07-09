-- ============================================
-- RPC: invite_player_to_session
-- ============================================
-- Allows the session host to add a player directly to the roster.
-- Runs with SECURITY DEFINER to bypass RLS for cross-user roster updates.
-- ============================================

CREATE OR REPLACE FUNCTION invite_player_to_session(
  p_session_id UUID,
  p_player_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_final_bill JSONB;
BEGIN
  SELECT host_id, final_bill INTO v_host_id, v_final_bill
  FROM sessions WHERE id = p_session_id FOR UPDATE;

  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the host can invite players';
  END IF;
  IF v_final_bill IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot invite to an ended session';
  END IF;

  UPDATE sessions
  SET player_ids = array_append(player_ids, p_player_id)
  WHERE id = p_session_id
    AND NOT (p_player_id = ANY(player_ids));
END;
$$;
