-- ============================================
-- RPC: record_match_result
-- ============================================
-- This function atomically updates session matches 
-- and player statistics. It runs with SECURITY DEFINER
-- to allow cross-user updates (bypassing RLS).
-- ============================================

CREATE OR REPLACE FUNCTION record_match_result(
  p_session_id UUID,
  p_match_id TEXT,
  p_court_index INT,
  p_team1_ids UUID[],
  p_team2_ids UUID[],
  p_winning_team_index INT,
  p_points_change INT,
  p_now TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winners UUID[];
  v_losers UUID[];
  v_player_id UUID;
BEGIN
  -- 1. Identify winners and losers
  IF p_winning_team_index = 1 THEN
    v_winners := p_team1_ids;
    v_losers := p_team2_ids;
  ELSE
    v_winners := p_team2_ids;
    v_losers := p_team1_ids;
  END IF;

  -- 2. Update Session: matches, court_assignments, match_start_times, check_in_times
  UPDATE sessions 
  SET 
    matches = COALESCE(matches, '[]'::jsonb) || jsonb_build_object(
      'id', p_match_id,
      'timestamp', p_now,
      'team1Ids', p_team1_ids,
      'team2Ids', p_team2_ids,
      'winningTeamIndex', p_winning_team_index,
      'pointsChange', p_points_change
    ),
    court_assignments = court_assignments - p_court_index::text,
    match_start_times = match_start_times - p_court_index::text,
    check_in_times = check_in_times || (
      SELECT jsonb_object_agg(pid, p_now)
      FROM unnest(p_team1_ids || p_team2_ids) AS pid
    )
  WHERE id = p_session_id;

  -- 3. Update Profiles: winners
  FOR v_player_id IN SELECT unnest(v_winners)
  LOOP
    UPDATE profiles 
    SET 
      points = points + p_points_change,
      wins = wins + 1,
      rank_frame = CASE
        WHEN points + p_points_change >= 2000 THEN 'ascended'
        WHEN points + p_points_change >= 1600 THEN 'void'
        WHEN points + p_points_change >= 1300 THEN 'combustion'
        WHEN points + p_points_change >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  -- 4. Update Profiles: losers
  FOR v_player_id IN SELECT unnest(v_losers)
  LOOP
    UPDATE profiles 
    SET 
      points = points - p_points_change,
      losses = losses + 1,
      rank_frame = CASE
        WHEN points - p_points_change >= 2000 THEN 'ascended'
        WHEN points - p_points_change >= 1600 THEN 'void'
        WHEN points - p_points_change >= 1300 THEN 'combustion'
        WHEN points - p_points_change >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_player_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
