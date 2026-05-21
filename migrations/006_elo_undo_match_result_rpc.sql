-- ============================================
-- RPC: undo_match_result (ELO-aware version)
-- For ELO matches: reads per-player deltas from stored eloChanges JSONB.
-- For legacy matches (no eloChanges): falls back to p_points_change.
-- Sign convention: eloChanges[winner] is +N, eloChanges[loser] is -N.
-- Undo: points - storedDelta reverses both signs correctly.
-- ============================================

CREATE OR REPLACE FUNCTION undo_match_result(
  p_session_id UUID,
  p_match_id TEXT,
  p_team1_ids UUID[],
  p_team2_ids UUID[],
  p_winning_team_index INT,
  p_points_change INT  -- legacy fallback only; ignored when eloChanges is present
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winners UUID[];
  v_losers  UUID[];
  v_player_id UUID;
  v_final_bill JSONB;
  v_matches JSONB;
  v_new_matches JSONB;
  v_match_elem JSONB;
  v_elo_changes JSONB;
  v_player_delta INT;
  v_new_points INT;
BEGIN
  -- 0. Guard: session must not be ended
  SELECT final_bill, matches INTO v_final_bill, v_matches
  FROM sessions WHERE id = p_session_id;

  IF v_final_bill IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session has ended. Results are locked.');
  END IF;

  -- 1. Extract the match element and its eloChanges
  SELECT elem INTO v_match_elem
  FROM jsonb_array_elements(COALESCE(v_matches, '[]'::JSONB)) AS elem
  WHERE elem->>'id' = p_match_id
  LIMIT 1;

  IF v_match_elem IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found in session.');
  END IF;

  v_elo_changes := v_match_elem -> 'eloChanges';  -- NULL for legacy matches

  -- 2. Identify winners and losers
  IF p_winning_team_index = 1 THEN
    v_winners := p_team1_ids;
    v_losers  := p_team2_ids;
  ELSE
    v_winners := p_team2_ids;
    v_losers  := p_team1_ids;
  END IF;

  -- 3. Remove the match from session matches array
  SELECT COALESCE(jsonb_agg(elem), '[]'::JSONB)
  INTO v_new_matches
  FROM jsonb_array_elements(COALESCE(v_matches, '[]'::JSONB)) AS elem
  WHERE elem->>'id' != p_match_id;

  UPDATE sessions SET matches = v_new_matches WHERE id = p_session_id;

  -- 4. Reverse winner profiles
  FOR v_player_id IN SELECT unnest(v_winners)
  LOOP
    IF v_elo_changes IS NOT NULL AND v_elo_changes ? v_player_id::TEXT THEN
      v_player_delta := (v_elo_changes ->> v_player_id::TEXT)::INT;
    ELSE
      -- Legacy: winner gained +p_points_change
      v_player_delta := p_points_change;
    END IF;

    -- Undo: subtract what was added (positive delta → subtract → restore original)
    v_new_points := (SELECT points FROM profiles WHERE id = v_player_id) - v_player_delta;

    UPDATE profiles
    SET
      points     = v_new_points,
      wins       = GREATEST(wins - 1, 0),
      rank_frame = CASE
        WHEN v_new_points >= 2000 THEN 'ascended'
        WHEN v_new_points >= 1600 THEN 'void'
        WHEN v_new_points >= 1300 THEN 'combustion'
        WHEN v_new_points >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  -- 5. Reverse loser profiles
  FOR v_player_id IN SELECT unnest(v_losers)
  LOOP
    IF v_elo_changes IS NOT NULL AND v_elo_changes ? v_player_id::TEXT THEN
      -- Stored delta is negative for losers; subtracting negative = adding back
      v_player_delta := (v_elo_changes ->> v_player_id::TEXT)::INT;
    ELSE
      -- Legacy: loser lost p_points_change, so v_player_delta = -p_points_change
      v_player_delta := -p_points_change;
    END IF;

    v_new_points := (SELECT points FROM profiles WHERE id = v_player_id) - v_player_delta;

    UPDATE profiles
    SET
      points     = v_new_points,
      losses     = GREATEST(losses - 1, 0),
      rank_frame = CASE
        WHEN v_new_points >= 2000 THEN 'ascended'
        WHEN v_new_points >= 1600 THEN 'void'
        WHEN v_new_points >= 1300 THEN 'combustion'
        WHEN v_new_points >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
