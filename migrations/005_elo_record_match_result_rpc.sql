-- ============================================
-- RPC: record_match_result (ELO version)
-- Replaces flat ±25 with per-player ELO deltas.
-- p_points_change parameter removed; server computes deltas.
-- Returns eloChanges so the client can patch the optimistic match.
-- ============================================

CREATE OR REPLACE FUNCTION record_match_result(
  p_session_id UUID,
  p_match_id TEXT,
  p_court_index INT,
  p_team1_ids UUID[],
  p_team2_ids UUID[],
  p_winning_team_index INT,
  p_now TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winners UUID[];
  v_losers  UUID[];

  v_rec RECORD;
  v_team1_avg NUMERIC := 0;
  v_team2_avg NUMERIC := 0;
  v_team1_count INT := 0;
  v_team2_count INT := 0;
  v_expected_winner NUMERIC;
  v_k INT;
  v_delta INT;
  v_new_points INT;
  v_total_games INT;

  v_elo_changes JSONB := '{}'::JSONB;
BEGIN
  -- 1. Identify winners and losers
  IF p_winning_team_index = 1 THEN
    v_winners := p_team1_ids;
    v_losers  := p_team2_ids;
  ELSE
    v_winners := p_team2_ids;
    v_losers  := p_team1_ids;
  END IF;

  -- 2. Compute team average ratings
  SELECT AVG(points), COUNT(*) INTO v_team1_avg, v_team1_count
  FROM profiles WHERE id = ANY(p_team1_ids);

  SELECT AVG(points), COUNT(*) INTO v_team2_avg, v_team2_count
  FROM profiles WHERE id = ANY(p_team2_ids);

  IF v_team1_count = 0 OR v_team2_count = 0 THEN
    RAISE EXCEPTION 'Invalid player IDs: one or both teams have no matching profiles';
  END IF;

  -- 3. Expected win probability for the winning team
  --    expectedWinner = 1 / (1 + 10^((avgLoser - avgWinner) / 400))
  IF p_winning_team_index = 1 THEN
    v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_team2_avg - v_team1_avg) / 950.0));
  ELSE
    v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_team1_avg - v_team2_avg) / 950.0));
  END IF;

  -- 4. Apply ELO to each winner: delta = ROUND(K * (1 - expectedWinner))
  FOR v_rec IN
    SELECT id, points, wins, losses FROM profiles WHERE id = ANY(v_winners)
  LOOP
    v_total_games := v_rec.wins + v_rec.losses;
    IF v_total_games < 10 THEN
      v_k := 50;
    ELSIF v_total_games <= 30 THEN
      v_k := 38;
    ELSE
      v_k := 25;
    END IF;

    v_delta := ROUND(v_k::NUMERIC * (1.0 - v_expected_winner));
    v_new_points := v_rec.points + v_delta;

    UPDATE profiles
    SET
      points     = v_new_points,
      wins       = wins + 1,
      rank_frame = CASE
        WHEN v_new_points >= 2000 THEN 'ascended'
        WHEN v_new_points >= 1600 THEN 'void'
        WHEN v_new_points >= 1300 THEN 'combustion'
        WHEN v_new_points >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_rec.id;

    v_elo_changes := v_elo_changes || jsonb_build_object(v_rec.id::TEXT, v_delta);
  END LOOP;

  -- 5. Apply ELO to each loser: delta = ROUND(K * (0 - expectedWinner))  [negative]
  FOR v_rec IN
    SELECT id, points, wins, losses FROM profiles WHERE id = ANY(v_losers)
  LOOP
    v_total_games := v_rec.wins + v_rec.losses;
    IF v_total_games < 10 THEN
      v_k := 50;
    ELSIF v_total_games <= 30 THEN
      v_k := 38;
    ELSE
      v_k := 25;
    END IF;

    v_delta := ROUND(v_k::NUMERIC * (v_expected_winner - 1.0));
    v_new_points := v_rec.points + v_delta;

    UPDATE profiles
    SET
      points     = v_new_points,
      losses     = losses + 1,
      rank_frame = CASE
        WHEN v_new_points >= 2000 THEN 'ascended'
        WHEN v_new_points >= 1600 THEN 'void'
        WHEN v_new_points >= 1300 THEN 'combustion'
        WHEN v_new_points >= 1100 THEN 'spark'
        ELSE 'unpolished'
      END
    WHERE id = v_rec.id;

    v_elo_changes := v_elo_changes || jsonb_build_object(v_rec.id::TEXT, v_delta);
  END LOOP;

  -- 6. Update session: append match with eloChanges, clear court state, reset check-in times
  UPDATE sessions
  SET
    matches = COALESCE(matches, '[]'::JSONB) || jsonb_build_object(
      'id',               p_match_id,
      'timestamp',        p_now,
      'team1Ids',         p_team1_ids,
      'team2Ids',         p_team2_ids,
      'winningTeamIndex', p_winning_team_index,
      'pointsChange',     0,
      'eloChanges',       v_elo_changes
    ),
    court_assignments = court_assignments - p_court_index::TEXT,
    match_start_times = match_start_times - p_court_index::TEXT,
    check_in_times    = check_in_times || (
      SELECT jsonb_object_agg(pid, p_now)
      FROM unnest(p_team1_ids || p_team2_ids) AS pid
    )
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'eloChanges', v_elo_changes);
END;
$$;
