-- ============================================
-- Keep It Up mini game: best score per player
-- A row only exists once a player has scored, so the scoreboard
-- lists only people who have played.
-- ============================================

CREATE TABLE IF NOT EXISTS keep_it_up_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  best_score INT NOT NULL CHECK (best_score > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE keep_it_up_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read keep it up scores" ON keep_it_up_scores;
CREATE POLICY "Authenticated users can read keep it up scores"
  ON keep_it_up_scores FOR SELECT
  TO authenticated
  USING (true);

-- Writes go through this RPC only: it can set the caller's own row and never lowers a best.
-- Returns the caller's stored best, so p_score = 0 reads it without creating a row.
CREATE OR REPLACE FUNCTION submit_keep_it_up_score(p_score INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_best INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_score > 0 THEN
    INSERT INTO keep_it_up_scores (user_id, best_score)
    VALUES (v_user_id, p_score)
    ON CONFLICT (user_id) DO UPDATE
      SET best_score = EXCLUDED.best_score, updated_at = now()
      WHERE keep_it_up_scores.best_score < EXCLUDED.best_score;
  END IF;

  SELECT best_score INTO v_best FROM keep_it_up_scores WHERE user_id = v_user_id;
  RETURN COALESCE(v_best, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_keep_it_up_score(INT) TO authenticated;
