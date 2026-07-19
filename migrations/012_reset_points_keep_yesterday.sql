-- ============================================
-- ONE-TIME: Reset points to 1000, keep Jul 18
-- ============================================
-- Run in Supabase SQL Editor ONCE.
--
-- Goal:
--   1. Set every profile.points to 1000
--   2. Leave wins / losses unchanged
--   3. Re-apply only match RP deltas from sessions whose
--      start_time falls on 2026-07-18 (Asia/Bangkok)
--   4. Refresh rank_frame from the new points
--   5. Leave special_frame alone
--
-- Deltas come from stored matches[].eloChanges when present;
-- legacy matches fall back to ±pointsChange.
-- ============================================

-- ----------------------------------------
-- Step 0: Preview sessions that will be kept
-- (run this alone first to confirm)
-- ----------------------------------------
SELECT
  id,
  title,
  location,
  start_time AT TIME ZONE 'Asia/Bangkok' AS start_bangkok,
  end_time   AT TIME ZONE 'Asia/Bangkok' AS end_bangkok,
  COALESCE(jsonb_array_length(matches), 0) AS match_count
FROM sessions
WHERE start_time >= TIMESTAMPTZ '2026-07-18 00:00:00+07'
  AND start_time <  TIMESTAMPTZ '2026-07-19 00:00:00+07'
ORDER BY start_time ASC;

-- ----------------------------------------
-- Step 1: Snapshot current profiles (before)
-- ----------------------------------------
SELECT id, name, points, wins, losses, rank_frame
FROM profiles
ORDER BY points DESC;

-- ----------------------------------------
-- Step 2: Reset points only (keep W/L)
-- ----------------------------------------
UPDATE profiles SET points = 1000;

-- ----------------------------------------
-- Step 3: Re-apply Jul 18 (Bangkok) deltas
-- ----------------------------------------
DO $$
DECLARE
  session_record RECORD;
  match_elem     JSONB;
  elo_changes    JSONB;
  winning_team   INT;
  points_change  INT;
  team1_ids      JSONB;
  team2_ids      JSONB;
  pid            TEXT;
  delta          INT;
  kv             RECORD;
BEGIN
  FOR session_record IN
    SELECT id, matches, start_time
    FROM sessions
    WHERE start_time >= TIMESTAMPTZ '2026-07-18 00:00:00+07'
      AND start_time <  TIMESTAMPTZ '2026-07-19 00:00:00+07'
      AND matches IS NOT NULL
      AND jsonb_array_length(matches) > 0
    ORDER BY start_time ASC
  LOOP
    FOR match_elem IN SELECT jsonb_array_elements(session_record.matches)
    LOOP
      elo_changes := match_elem -> 'eloChanges';

      -- Prefer per-player ELO deltas when present and non-empty
      IF elo_changes IS NOT NULL
         AND jsonb_typeof(elo_changes) = 'object'
         AND elo_changes <> '{}'::JSONB
      THEN
        FOR kv IN SELECT * FROM jsonb_each(elo_changes)
        LOOP
          delta := (kv.value)::INT;
          UPDATE profiles
          SET points = points + delta
          WHERE id = (kv.key)::UUID;
        END LOOP;
      ELSE
        -- Legacy flat ±pointsChange
        winning_team  := (match_elem ->> 'winningTeamIndex')::INT;
        points_change := COALESCE((match_elem ->> 'pointsChange')::INT, 0);
        team1_ids     := match_elem -> 'team1Ids';
        team2_ids     := match_elem -> 'team2Ids';

        IF points_change = 0 THEN
          CONTINUE;
        END IF;

        IF winning_team = 1 THEN
          FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
          LOOP
            UPDATE profiles SET points = points + points_change WHERE id = pid::UUID;
          END LOOP;
          FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
          LOOP
            UPDATE profiles SET points = points - points_change WHERE id = pid::UUID;
          END LOOP;
        ELSE
          FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
          LOOP
            UPDATE profiles SET points = points + points_change WHERE id = pid::UUID;
          END LOOP;
          FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
          LOOP
            UPDATE profiles SET points = points - points_change WHERE id = pid::UUID;
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------
-- Step 4: Refresh rank_frame from points
-- ----------------------------------------
UPDATE profiles SET rank_frame =
  CASE
    WHEN points >= 2000 THEN 'ascended'
    WHEN points >= 1600 THEN 'void'
    WHEN points >= 1300 THEN 'combustion'
    WHEN points >= 1100 THEN 'spark'
    ELSE 'unpolished'
  END;

-- ----------------------------------------
-- Step 5: Verify profiles (after)
-- ----------------------------------------
SELECT id, name, points, wins, losses, rank_frame
FROM profiles
ORDER BY points DESC;

-- ----------------------------------------
-- Step 6: Summary — net deltas re-applied
-- from Jul 18 sessions (for spot-check)
-- ----------------------------------------
WITH jul18_matches AS (
  SELECT jsonb_array_elements(matches) AS match_elem
  FROM sessions
  WHERE start_time >= TIMESTAMPTZ '2026-07-18 00:00:00+07'
    AND start_time <  TIMESTAMPTZ '2026-07-19 00:00:00+07'
    AND matches IS NOT NULL
    AND jsonb_array_length(matches) > 0
),
elo_deltas AS (
  SELECT
    kv.key AS player_id,
    SUM((kv.value)::INT) AS net_delta
  FROM jul18_matches m
  CROSS JOIN LATERAL jsonb_each(m.match_elem -> 'eloChanges') AS kv
  WHERE m.match_elem -> 'eloChanges' IS NOT NULL
    AND jsonb_typeof(m.match_elem -> 'eloChanges') = 'object'
    AND (m.match_elem -> 'eloChanges') <> '{}'::JSONB
  GROUP BY kv.key
)
SELECT
  p.name,
  e.player_id,
  e.net_delta,
  p.points AS points_after,
  p.wins,
  p.losses,
  p.rank_frame
FROM elo_deltas e
JOIN profiles p ON p.id = e.player_id::UUID
ORDER BY e.net_delta DESC;
