-- ============================================
-- RPC: undo_match_result
-- ============================================
-- This function atomically reverses a recorded match result.
-- It removes the match from the session, and reverses
-- points/wins/losses on all affected player profiles.
-- Only works if the session has NOT been ended (no final_bill).
-- Runs with SECURITY DEFINER to allow cross-user updates.
-- ============================================

CREATE OR REPLACE FUNCTION undo_match_result(
  p_session_id UUID,
  p_match_id TEXT,
  p_team1_ids UUID[],
  p_team2_ids UUID[],
  p_winning_team_index INT,
  p_points_change INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winners UUID[];
  v_losers UUID[];
  v_player_id UUID;
  v_final_bill JSONB;
  v_matches JSONB;
  v_new_matches JSONB;
BEGIN
  -- 0. Guard: Check session is not ended
  SELECT final_bill, matches INTO v_final_bill, v_matches
  FROM sessions WHERE id = p_session_id;

  IF v_final_bill IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session has ended. Results are locked.');
  END IF;

  -- 1. Identify winners and losers
  IF p_winning_team_index = 1 THEN
    v_winners := p_team1_ids;
    v_losers := p_team2_ids;
  ELSE
    v_winners := p_team2_ids;
    v_losers := p_team1_ids;
  END IF;

  -- 2. Remove the match from session matches array
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  INTO v_new_matches
  FROM jsonb_array_elements(COALESCE(v_matches, '[]'::jsonb)) AS elem
  WHERE elem->>'id' != p_match_id;

  UPDATE sessions
  SET matches = v_new_matches
  WHERE id = p_session_id;

  -- 3. Reverse winner profiles: subtract points, decrement wins
  FOR v_player_id IN SELECT unnest(v_winners)
  LOOP
    UPDATE profiles
    SET
      points = points - p_points_change,
      wins = GREATEST(wins - 1, 0),
      rank_frame = CASE
        WHEN points - p_points_change >= 2000 THEN 'ascended'
        WHEN points - p_points_change >= 1600 THEN 'void'
        WHEN points - p_points_change >= 1300 THEN 'combustion'
        WHEN points - p_points_change >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  -- 4. Reverse loser profiles: add back points, decrement losses
  FOR v_player_id IN SELECT unnest(v_losers)
  LOOP
    UPDATE profiles
    SET
      points = points + p_points_change,
      losses = GREATEST(losses - 1, 0),
      rank_frame = CASE
        WHEN points + p_points_change >= 2000 THEN 'ascended'
        WHEN points + p_points_change >= 1600 THEN 'void'
        WHEN points + p_points_change >= 1300 THEN 'combustion'
        WHEN points + p_points_change >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
