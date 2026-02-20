-- ============================================
-- MIGRATION: Add wins/losses columns to profiles
-- ============================================
-- Run this in Supabase SQL Editor ONCE.
-- This adds wins/losses columns and backfills them
-- from historical match data in sessions.
-- ============================================

-- Step 1: Add columns (safe if already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;

-- Step 2: Reset to 0
UPDATE profiles SET wins = 0, losses = 0;

-- Step 3: Replay all matches and accumulate wins/losses
DO $$
DECLARE
    session_record RECORD;
    match_elem JSONB;
    winning_team_index INT;
    team1_ids JSONB;
    team2_ids JSONB;
    pid TEXT;
BEGIN
    FOR session_record IN 
        SELECT id, matches, start_time 
        FROM sessions 
        WHERE matches IS NOT NULL 
          AND jsonb_array_length(matches) > 0
        ORDER BY start_time ASC
    LOOP
        FOR match_elem IN SELECT jsonb_array_elements(session_record.matches)
        LOOP
            winning_team_index := (match_elem ->> 'winningTeamIndex')::INT;
            team1_ids := match_elem -> 'team1Ids';
            team2_ids := match_elem -> 'team2Ids';
            
            IF winning_team_index = 1 THEN
                -- Team 1 wins
                FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
                LOOP
                    UPDATE profiles SET wins = wins + 1 WHERE id = pid::UUID;
                END LOOP;
                FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
                LOOP
                    UPDATE profiles SET losses = losses + 1 WHERE id = pid::UUID;
                END LOOP;
            ELSE
                -- Team 2 wins
                FOR pid IN SELECT jsonb_array_elements_text(team2_ids)
                LOOP
                    UPDATE profiles SET wins = wins + 1 WHERE id = pid::UUID;
                END LOOP;
                FOR pid IN SELECT jsonb_array_elements_text(team1_ids)
                LOOP
                    UPDATE profiles SET losses = losses + 1 WHERE id = pid::UUID;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Verify results
SELECT id, name, points, wins, losses, rank_frame FROM profiles ORDER BY points DESC;
