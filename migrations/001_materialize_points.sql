-- ============================================
-- ONE-TIME MIGRATION: Recalculate Profile Points
-- ============================================
-- Run this in Supabase SQL Editor ONCE before deploying
-- the new code that relies on profiles.points as the
-- canonical source of truth.
--
-- This script replays all historical matches to derive
-- the correct points for each player.
-- ============================================

-- Step 1: Reset all points to base 1000
UPDATE profiles SET points = 1000;

-- Step 2: Replay all matches and accumulate points
-- This uses a PL/pgSQL block to iterate through all
-- sessions' matches in chronological order.
DO $$
DECLARE
    session_record RECORD;
    match_elem JSONB;
    winning_team_index INT;
    points_change INT;
    team1_ids JSONB;
    team2_ids JSONB;
    pid TEXT;
BEGIN
    -- Loop through all sessions ordered by start_time
    FOR session_record IN 
        SELECT id, matches, start_time 
        FROM sessions 
        WHERE matches IS NOT NULL 
          AND jsonb_array_length(matches) > 0
        ORDER BY start_time ASC
    LOOP
        -- Loop through each match in the session
        FOR match_elem IN SELECT jsonb_array_elements(session_record.matches)
        LOOP
            winning_team_index := (match_elem ->> 'winningTeamIndex')::INT;
            points_change := COALESCE((match_elem ->> 'pointsChange')::INT, 25);
            team1_ids := match_elem -> 'team1Ids';
            team2_ids := match_elem -> 'team2Ids';
            
            -- Award points to winners, deduct from losers
            IF winning_team_index = 1 THEN
                -- Team 1 wins
                FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
                LOOP
                    UPDATE profiles SET points = points + points_change WHERE id = pid::UUID;
                END LOOP;
                FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
                LOOP
                    UPDATE profiles SET points = points - points_change WHERE id = pid::UUID;
                END LOOP;
            ELSE
                -- Team 2 wins
                FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
                LOOP
                    UPDATE profiles SET points = points + points_change WHERE id = pid::UUID;
                END LOOP;
                FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
                LOOP
                    UPDATE profiles SET points = points - points_change WHERE id = pid::UUID;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Update rank_frame based on new points
UPDATE profiles SET rank_frame = 
    CASE
        WHEN points >= 2000 THEN 'ascended'
        WHEN points >= 1600 THEN 'void'
        WHEN points >= 1300 THEN 'combustion'
        WHEN points >= 1100 THEN 'spark'
        ELSE 'unpolished'
    END;

-- Step 4: Verify results
SELECT id, name, points, rank_frame FROM profiles ORDER BY points DESC;
